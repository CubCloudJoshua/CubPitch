#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  getMethodology,
  METHODOLOGIES,
  parseDeck,
  reviewDeck,
  slideTitle,
  slugify,
  starterDeck,
  visibleSlides,
  type Deck,
  type ReviewFinding,
} from '@cubpitch/core';
import { deckToPdf, deckToPptx, findOverflow } from '@cubpitch/export';
import { renderDeckHtml } from '@cubpitch/render';
import { getTheme, THEMES } from '@cubpitch/theme';
import { FileDeckStore } from '@cubpitch/storage';
import { cmdCritique, cmdDraft, cmdQa, cmdRewrite, explainModelError } from './ai-commands.js';
import { flagBool, flagString, parseArgs, type ParsedArgs } from './args.js';
import { accent, bold, dim, green, heading, red, table, yellow } from './ui.js';

/**
 * The CubPitch command line.
 *
 * This exists so the platform is useful the day it is cloned, before any
 * database or web server is involved. A deck is a JSON file, and every command
 * here operates on one.
 */

const DEFAULT_ROOT = process.env['CUBPITCH_HOME'] ?? resolve(process.cwd(), 'decks');

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case 'new':
      return cmdNew(args);
    case 'list':
      return cmdList(args);
    case 'review':
      return cmdReview(args);
    case 'export':
      return cmdExport(args);
    case 'html':
      return cmdHtml(args);
    case 'draft':
      return withModel(args, async () => {
        const briefPath = args.positional[0];
        const company = flagString(args, 'company', '');
        if (!briefPath || !company) {
          process.stderr.write('Usage: cubpitch draft <brief.md> --company "Name" [--methodology house]\n');
          return 1;
        }
        return cmdDraft(aiContext(args), {
          briefPath,
          company,
          methodologyId: flagString(args, 'methodology', 'house'),
          themeId: flagString(args, 'theme', 'cubcloud'),
          guidance: flagString(args, 'guidance', ''),
        });
      });
    case 'critique':
      return withModel(args, async () => {
        const deck = await loadDeck(args);
        if (!deck) return 1;
        return cmdCritique(deck, aiContext(args), flagString(args, 'audience', '') || undefined);
      });
    case 'rewrite':
      return withModel(args, async () => {
        const deck = await loadDeck(args);
        if (!deck) return 1;
        const slide = Number(flagString(args, 'slide', ''));
        if (!Number.isInteger(slide) || slide < 1) {
          process.stderr.write('Which slide? Pass --slide <number>, as shown by `cubpitch review`.\n');
          return 1;
        }
        return cmdRewrite(deck, aiContext(args), {
          slide,
          instruction: flagString(args, 'instruction', '') || undefined,
          dryRun: flagBool(args, 'dry-run'),
        });
      });
    case 'qa':
      return withModel(args, async () => {
        const deck = await loadDeck(args);
        if (!deck) return 1;
        return cmdQa(deck, aiContext(args), {
          audience: flagString(args, 'audience', '') || undefined,
          out: flagString(args, 'out', '') || undefined,
        });
      });
    case 'methodologies':
      return cmdMethodologies();
    case 'themes':
      return cmdThemes();
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      return 0;
    default:
      process.stderr.write(`Unknown command: ${args.command}\n\n`);
      printHelp();
      return 1;
  }
}

// --- Commands ---------------------------------------------------------------

async function cmdNew(args: ParsedArgs): Promise<number> {
  const name = args.positional[0];
  if (!name) {
    process.stderr.write('Usage: cubpitch new "Company Name" [--methodology house] [--theme cubcloud]\n');
    return 1;
  }

  const methodologyId = flagString(args, 'methodology', 'house');
  const themeId = flagString(args, 'theme', 'cubcloud');
  const methodology = getMethodology(methodologyId);

  if (methodology.id !== methodologyId) {
    process.stderr.write(`Unknown methodology "${methodologyId}". Run: cubpitch methodologies\n`);
    return 1;
  }

  const deck = starterDeck({
    title: flagString(args, 'title', `${name} ${methodology.name}`),
    company: { name, tagline: flagString(args, 'tagline', '') },
    themeId,
    methodologyId,
  });

  const store = new FileDeckStore({ root: storeRoot(args) });
  const saved = await store.put(deck, { note: 'created' });

  process.stdout.write(
    `${green('Created')} ${bold(saved.title)}\n` +
      `  ${dim('id')}          ${saved.id}\n` +
      `  ${dim('methodology')} ${methodology.name} ${dim(`(${methodology.steps.length} slides, ${methodology.targetMinutes} min)`)}\n` +
      `  ${dim('theme')}       ${getTheme(themeId).name}\n` +
      `  ${dim('path')}        ${join(storeRoot(args), saved.id, 'deck.json')}\n\n` +
      `${methodology.summary}\n\n` +
      `Each slide is titled with its job. Fill them in, then run:\n` +
      `  ${accent(`cubpitch review ${saved.id}`)}\n`,
  );
  return 0;
}

async function cmdList(args: ParsedArgs): Promise<number> {
  const store = new FileDeckStore({ root: storeRoot(args) });
  const decks = await store.list();

  if (decks.length === 0) {
    process.stdout.write(`No decks in ${storeRoot(args)}\nStart one: ${accent('cubpitch new "Company"')}\n`);
    return 0;
  }

  process.stdout.write(
    `${table([
      [dim('ID'), dim('TITLE'), dim('METHODOLOGY'), dim('SLIDES'), dim('UPDATED')],
      ...decks.map((deck) => [
        deck.id,
        deck.title,
        getMethodology(deck.methodologyId).name,
        String(deck.slideCount),
        deck.updatedAt.slice(0, 16).replace('T', ' '),
      ]),
    ])}\n`,
  );
  return 0;
}

async function cmdReview(args: ParsedArgs): Promise<number> {
  const deck = await loadDeck(args);
  if (!deck) return 1;

  const review = reviewDeck(deck);
  const methodology = review.methodology;

  process.stdout.write(
    `${heading(deck.title)} ${dim(`· ${methodology.name}`)}\n` +
      `${dim(`${visibleSlides(deck).length} slides · reads in about ${review.minutes} min · budget ${methodology.targetMinutes} min`)}\n\n`,
  );

  if (review.findings.length === 0) {
    process.stdout.write(`${green('Nothing to flag.')}\n`);
    return 0;
  }

  const byId = new Map(deck.slides.map((slide, index) => [slide.id, { slide, number: index + 1 }]));
  const deckLevel = review.findings.filter((finding) => !finding.slideId);
  const slideLevel = review.findings.filter((finding) => finding.slideId);

  if (deckLevel.length > 0) {
    process.stdout.write(`${heading('The deck')}\n`);
    for (const finding of deckLevel) process.stdout.write(`  ${formatFinding(finding)}\n`);
    process.stdout.write('\n');
  }

  const grouped = new Map<string, ReviewFinding[]>();
  for (const finding of slideLevel) {
    const list = grouped.get(finding.slideId!) ?? [];
    list.push(finding);
    grouped.set(finding.slideId!, list);
  }

  for (const [slideId, findings] of grouped) {
    const entry = byId.get(slideId);
    const label = entry ? `${entry.number}. ${slideTitle(entry.slide)}` : slideId;
    process.stdout.write(`${heading(label)}\n`);
    for (const finding of findings) process.stdout.write(`  ${formatFinding(finding)}\n`);
    process.stdout.write('\n');
  }

  if (flagBool(args, 'layout')) {
    const overflow = await findOverflow(deck, { webFonts: false });
    if (overflow.length > 0) {
      process.stdout.write(`${heading('Layout')}\n`);
      for (const finding of overflow) {
        process.stdout.write(`  ${yellow('overflow')} ${finding.number}. ${finding.title} ${dim(`(+${finding.overflowPx}px)`)}\n`);
      }
      process.stdout.write('\n');
    }
  }

  process.stdout.write(
    `${review.errors > 0 ? red(`${review.errors} error${review.errors === 1 ? '' : 's'}`) : green('0 errors')}` +
      `${dim(' · ')}${review.warnings > 0 ? yellow(`${review.warnings} warnings`) : '0 warnings'}\n`,
  );

  // Errors fail the command so this can gate a commit or a send.
  return review.errors > 0 && flagBool(args, 'strict') ? 1 : 0;
}

async function cmdExport(args: ParsedArgs): Promise<number> {
  const deck = await loadDeck(args);
  if (!deck) return 1;

  const outDir = flagString(args, 'out', process.cwd());
  const base = exportBasename(deck);
  const wantPdf = flagBool(args, 'pdf') || !flagBool(args, 'pptx');
  const wantPptx = flagBool(args, 'pptx') || !flagBool(args, 'pdf');

  await mkdir(outDir, { recursive: true });
  const written: string[] = [];

  if (wantPdf) {
    const path = join(outDir, `${base}.pdf`);
    await writeFile(path, await deckToPdf(deck, { webFonts: !flagBool(args, 'offline') }));
    written.push(path);
  }
  if (wantPptx) {
    const path = join(outDir, `${base}.pptx`);
    await writeFile(path, await deckToPptx(deck));
    written.push(path);
  }

  for (const path of written) process.stdout.write(`${green('Wrote')} ${path}\n`);

  // Exporting is the moment before sending, which is the moment to mention a
  // slide whose content is being clipped.
  const overflow = await findOverflow(deck, { webFonts: false }).catch(() => []);
  if (overflow.length > 0) {
    process.stdout.write(
      `\n${yellow('Content does not fit on')} ${overflow.length} slide${overflow.length === 1 ? '' : 's'}${dim(' (text is clipped):')}\n`,
    );
    for (const finding of overflow) process.stdout.write(`  ${finding.number}. ${finding.title}\n`);
  }
  return 0;
}

async function cmdHtml(args: ParsedArgs): Promise<number> {
  const deck = await loadDeck(args);
  if (!deck) return 1;

  const path = flagString(args, 'out', join(process.cwd(), `${slugify(deck.title)}.html`));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, renderDeckHtml(deck), 'utf8');
  process.stdout.write(`${green('Wrote')} ${path}\n`);
  return 0;
}

function cmdMethodologies(): number {
  for (const methodology of METHODOLOGIES) {
    process.stdout.write(
      `${accent(methodology.id.padEnd(10))} ${bold(methodology.name)} ${dim(`· ${methodology.source}`)}\n` +
        `${' '.repeat(11)}${methodology.summary}\n` +
        `${' '.repeat(11)}${dim(
          `${methodology.steps.length} steps · ${methodology.targetSlides.min}-${methodology.targetSlides.max} slides · ${methodology.targetMinutes} min` +
            (methodology.minFontPt ? ` · min ${methodology.minFontPt}pt` : ''),
        )}\n\n`,
    );
  }
  return 0;
}

function cmdThemes(): number {
  process.stdout.write(
    `${table([
      [dim('ID'), dim('NAME'), dim('MODE'), dim('ACCENT')],
      ...THEMES.map((theme) => [theme.id, theme.name, theme.mode, theme.colors.accent]),
    ])}\n`,
  );
  return 0;
}

// --- Helpers ----------------------------------------------------------------

/**
 * Export filename.
 *
 * The company name is prefixed only when the title does not already carry it,
 * so "CubCloud Seed 2026" exports as cubcloud-seed-2026.pdf rather than
 * cubcloud-cubcloud-seed-2026.pdf. This lands in an investor's downloads
 * folder next to forty other decks, so it is worth getting right.
 */
export function exportBasename(deck: Deck): string {
  const title = slugify(deck.title);
  const company = slugify(deck.company.name);
  return title.startsWith(company) ? title : `${company}-${title}`;
}

function aiContext(args: ParsedArgs): { storeRoot: string; model?: string } {
  const model = flagString(args, 'model', '');
  return { storeRoot: storeRoot(args), ...(model ? { model } : {}) };
}

/**
 * Run a command that talks to a model.
 *
 * Model failures are ordinary here rather than exceptional: a rate limit, a
 * missing key, an answer that would not parse. Each one gets a sentence saying
 * whether retrying would help, instead of a stack trace.
 */
async function withModel(_args: ParsedArgs, run: () => Promise<number>): Promise<number> {
  try {
    return await run();
  } catch (error) {
    process.stderr.write(`${red('Failed')} ${explainModelError(error)}\n`);
    return 1;
  }
}

function storeRoot(args: ParsedArgs): string {
  return resolve(flagString(args, 'root', DEFAULT_ROOT));
}

/** Accept either a deck id in the store or a path to a deck JSON file. */
async function loadDeck(args: ParsedArgs): Promise<Deck | null> {
  const target = args.positional[0];
  if (!target) {
    process.stderr.write('Which deck? Pass a deck id or a path to a deck.json\n');
    return null;
  }

  if (target.endsWith('.json')) {
    const { readFile } = await import('node:fs/promises');
    try {
      return parseDeck(JSON.parse(await readFile(target, 'utf8')));
    } catch (error) {
      process.stderr.write(`Could not read ${target}: ${(error as Error).message}\n`);
      return null;
    }
  }

  const store = new FileDeckStore({ root: storeRoot(args) });
  const deck = await store.get(target);
  if (!deck) {
    process.stderr.write(`No deck ${target} in ${storeRoot(args)}\n`);
    return null;
  }
  return deck;
}

function formatFinding(finding: ReviewFinding): string {
  const tag =
    finding.severity === 'error' ? red('error   ') : finding.severity === 'warning' ? yellow('warning ') : dim('note    ');
  return `${tag} ${finding.message} ${dim(`[${finding.rule}]`)}`;
}

function printHelp(): void {
  process.stdout.write(
    `${bold('cubpitch')} ${dim('· pitch decks as structured documents')}

${heading('Commands')}
  new <company>          Start a deck in a methodology's flow
  list                   Decks in the store
  review <deck>          Check the deck against its methodology
  export <deck>          Write PDF and PowerPoint
  html <deck>            Write a standalone HTML deck
  methodologies          Pitch frameworks available
  themes                 Themes available

${dim('These call a model and need ANTHROPIC_API_KEY:')}
  draft <brief>          Draft a deck from a brief
  critique <deck>        Read the deck as a partner would
  rewrite <deck>         Rewrite one slide (--slide N, --instruction, --dry-run)
  qa <deck>              The questions they will ask, and the answers you have

${heading('Options')}
  --root <dir>           Deck store (default ./decks, or CUBPITCH_HOME)
  --methodology <id>     house, sequoia, yc, kawasaki, a16z
  --theme <id>           cubcloud, slate, paper, ledger
  --out <path>           Export destination
  --pdf / --pptx         Export only one format (default: both)
  --offline              Render without fetching web fonts
  --layout               Also measure whether content fits (review)
  --strict               Exit non-zero when review finds errors
  --company <name>       Company name (draft)
  --audience <text>      Who is reading (critique, qa)
  --guidance <text>      Extra direction for the drafter
  --slide <n>            Which slide to rewrite
  --instruction <text>   What to change: "tighter", "lead with the number"
  --dry-run              Show the rewrite without saving it
  --model <id>           Override the model

${heading('Examples')}
  cubpitch new "CubCloud" --methodology house --theme cubcloud
  cubpitch review dck_a1b2c3 --layout
  cubpitch export ./decks/dck_a1b2c3/deck.json --out ./out
  cubpitch draft brief.md --company "CubCloud" --methodology house
  cubpitch critique dck_a1b2c3 --audience "Healthcare seed fund"
  cubpitch rewrite dck_a1b2c3 --slide 5 --instruction "lead with the number"
  cubpitch qa dck_a1b2c3 --out ./qa-prep.md
`,
  );
}

/**
 * Run only when invoked as the program.
 *
 * Without this guard, importing anything from this module runs the CLI: the
 * tests that check argument parsing printed the help text and set an exit code
 * as a side effect of the import.
 */
const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      process.stderr.write(`${red('Failed')} ${(error as Error).message}\n`);
      process.exitCode = 1;
    });
}

export { main };
