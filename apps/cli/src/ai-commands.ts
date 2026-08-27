import { writeFile } from 'node:fs/promises';
import { critiqueDeck, draftDeck, prepareQa, rewriteSlide, AnthropicProvider, ModelError } from '@cubpitch/ai';
import { reviewDeck, slideTitle, visibleSlides, type Deck } from '@cubpitch/core';
import { FileDeckStore } from '@cubpitch/storage';
import { readFile } from 'node:fs/promises';
import { accent, bold, dim, green, heading, red, yellow } from './ui.js';

/**
 * The commands that cost money.
 *
 * Kept apart from the rest of the CLI so the provider is only constructed when
 * one of them runs. Everything else in this tool works with no API key, and a
 * missing key should not stop someone reviewing a deck.
 */

export interface AiContext {
  storeRoot: string;
  model?: string;
}

function provider(context: AiContext): AnthropicProvider {
  return new AnthropicProvider(context.model ? { model: context.model } : {});
}

/** brief file -> deck in the store. */
export async function cmdDraft(
  context: AiContext,
  input: { briefPath: string; company: string; methodologyId?: string; themeId?: string; guidance?: string },
): Promise<number> {
  const brief = await readFile(input.briefPath, 'utf8');

  process.stdout.write(`${dim('Drafting from')} ${input.briefPath}${dim('. This takes a minute.')}\n`);

  const result = await draftDeck(provider(context), {
    brief,
    company: input.company,
    ...(input.methodologyId ? { methodologyId: input.methodologyId } : {}),
    ...(input.themeId ? { themeId: input.themeId } : {}),
    ...(input.guidance ? { guidance: input.guidance } : {}),
  });

  const store = new FileDeckStore({ root: context.storeRoot });
  const saved = await store.put(result.deck, { note: 'drafted' });

  process.stdout.write(`\n${green('Drafted')} ${bold(saved.title)} ${dim(saved.id)}\n\n`);

  if (result.assumptions.length > 0) {
    process.stdout.write(`${heading('Assumed, because the brief did not say')}\n`);
    for (const item of result.assumptions) process.stdout.write(`  ${yellow('·')} ${item}\n`);
    process.stdout.write('\n');
  }
  if (result.missing.length > 0) {
    process.stdout.write(`${heading('You still have to supply')}\n`);
    for (const item of result.missing) process.stdout.write(`  ${red('·')} ${item}\n`);
    process.stdout.write('\n');
  }

  const review = reviewDeck(saved);
  process.stdout.write(
    `${dim(`${review.errors} errors, ${review.warnings} warnings. Next:`)}\n  ${accent(`cubpitch review ${saved.id}`)}\n`,
  );
  return 0;
}

export async function cmdCritique(deck: Deck, context: AiContext, audience?: string): Promise<number> {
  process.stdout.write(`${dim('Reading the deck as a partner would.')}\n\n`);
  const result = await critiqueDeck(provider(context), { deck, ...(audience ? { audience } : {}) });

  const numbers = new Map(deck.slides.map((slide, index) => [index + 1, slideTitle(slide)]));

  process.stdout.write(`${heading('What the deck said')}\n  ${result.readback}\n\n`);
  process.stdout.write(`${heading('Biggest risk')}\n  ${yellow(result.biggestRisk)}\n\n`);

  const order = { blocking: 0, serious: 1, minor: 2 } as const;
  const findings = [...result.findings].sort((a, b) => order[a.severity] - order[b.severity]);

  for (const finding of findings) {
    const tag =
      finding.severity === 'blocking' ? red('blocking') : finding.severity === 'serious' ? yellow('serious ') : dim('minor   ');
    const where = finding.slide > 0 ? `${finding.slide}. ${numbers.get(finding.slide) ?? ''}` : 'The deck';
    process.stdout.write(`${tag} ${bold(where)}\n  ${finding.problem}\n  ${dim(finding.why)}\n  ${accent('Fix:')} ${finding.fix}\n\n`);
  }

  if (result.strengths.length > 0) {
    process.stdout.write(`${heading('Working')}\n`);
    for (const item of result.strengths) process.stdout.write(`  ${green('·')} ${item}\n`);
  }
  return findings.some((finding) => finding.severity === 'blocking') ? 1 : 0;
}

export async function cmdQa(deck: Deck, context: AiContext, options: { audience?: string; out?: string }): Promise<number> {
  process.stdout.write(`${dim('Working out what they will ask.')}\n\n`);
  const result = await prepareQa(provider(context), { deck, ...(options.audience ? { audience: options.audience } : {}) });

  const lines: string[] = [`# Question prep: ${deck.title}`, ''];

  for (const objection of result.objections) {
    const tag = objection.likelihood === 'certain' ? red('certain ') : objection.likelihood === 'likely' ? yellow('likely  ') : dim('possible');
    process.stdout.write(`${tag} ${bold(objection.question)}\n  ${dim(objection.behind)}\n`);
    if (objection.answer) process.stdout.write(`  ${green('Answer:')} ${objection.answer}\n`);
    if (objection.needed) process.stdout.write(`  ${red('Find out:')} ${objection.needed}\n`);
    process.stdout.write('\n');

    lines.push(`## ${objection.question}`, '', `*${objection.behind}*`, '');
    if (objection.answer) lines.push(objection.answer, '');
    if (objection.needed) lines.push(`**Still need:** ${objection.needed}`, '');
  }

  if (result.appendix.length > 0) {
    process.stdout.write(`${heading('Worth having in an appendix')}\n`);
    for (const item of result.appendix) process.stdout.write(`  ${dim('·')} ${item}\n`);
    lines.push('## Appendix material', '', ...result.appendix.map((item) => `- ${item}`));
  }

  if (options.out) {
    await writeFile(options.out, `${lines.join('\n')}\n`, 'utf8');
    process.stdout.write(`\n${green('Wrote')} ${options.out}\n`);
  }
  return 0;
}

/**
 * Rewrite one slide, in place.
 *
 * Takes a slide number as shown by `review`, because nobody reads slide ids off
 * a terminal. The rewrite is written back to the store only if something
 * actually changed, and the before and after are printed so the author can undo
 * it with a version restore if they disagree.
 */
export async function cmdRewrite(
  deck: Deck,
  context: AiContext,
  options: { slide: number; instruction?: string; dryRun: boolean },
): Promise<number> {
  const slides = visibleSlides(deck);
  const target = slides[options.slide - 1];
  if (!target) {
    process.stderr.write(`No slide ${options.slide}. This deck has ${slides.length}.\n`);
    return 1;
  }

  process.stdout.write(`${dim('Rewriting')} ${bold(`${options.slide}. ${slideTitle(target)}`)}\n\n`);

  const result = await rewriteSlide(provider(context), {
    deck,
    slideId: target.id,
    ...(options.instruction ? { instruction: options.instruction } : {}),
  });

  const before = target as unknown as Record<string, unknown>;
  const after = result.slide as unknown as Record<string, unknown>;
  const skip = new Set(['id', 'type', 'notes', 'hidden']);
  const changed = Object.keys(after).filter(
    (key) => !skip.has(key) && typeof after[key] === 'string' && after[key] !== before[key],
  );

  if (changed.length === 0) {
    process.stdout.write(`${green('Nothing changed.')} ${dim(result.rationale)}\n`);
    return 0;
  }

  process.stdout.write(`${dim(result.rationale)}\n\n`);
  for (const key of changed) {
    process.stdout.write(`${heading(key)}\n`);
    process.stdout.write(`  ${red('-')} ${dim(String(before[key] ?? '') || '(empty)')}\n`);
    process.stdout.write(`  ${green('+')} ${String(after[key])}\n\n`);
  }

  if (result.needed.length > 0) {
    process.stdout.write(`${heading('It needed')}\n`);
    for (const item of result.needed) process.stdout.write(`  ${yellow('·')} ${item}\n`);
    process.stdout.write('\n');
  }
  if (result.ignored.length > 0) {
    process.stdout.write(`${dim(`Ignored fields the slide does not have: ${result.ignored.join(', ')}`)}\n\n`);
  }

  if (options.dryRun) {
    process.stdout.write(`${dim('Dry run. Nothing was written.')}\n`);
    return 0;
  }

  const store = new FileDeckStore({ root: context.storeRoot });
  await store.put(result.deck, { note: `rewrote slide ${options.slide}` });
  process.stdout.write(`${green('Saved.')} ${dim('The previous version is in the deck history.')}\n`);
  return 0;
}

/** Turn a model failure into something an operator can act on. */
export function explainModelError(error: unknown): string {
  if (error instanceof ModelError) {
    return error.retryable ? `${error.message} This one is worth retrying.` : error.message;
  }
  return (error as Error).message;
}
