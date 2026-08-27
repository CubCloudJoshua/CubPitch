import {
  AskSlide,
  BusinessModelSlide,
  CompetitionSlide,
  CoverSlide,
  createDeck,
  getMethodology,
  GoToMarketSlide,
  MarketSlide,
  parseDeck,
  ProblemSlide,
  ProductSlide,
  slideId,
  SolutionSlide,
  TeamSlide,
  TractionSlide,
  WhyNowSlide,
  type Deck,
  type Slide,
  type SlideType,
} from '@cubpitch/core';
import { z } from 'zod';
import type { ModelProvider } from './provider.js';
import { UNTRUSTED_PREAMBLE, wrapUntrusted } from './untrusted.js';

/**
 * Drafting a deck from a brief.
 *
 * The schema the model answers against is *derived* from the real slide
 * schemas by dropping the fields the model has no business inventing: ids,
 * speaker notes, and visibility. Deriving rather than restating means the two
 * cannot drift, and a new field on the problem slide is a field the drafter can
 * fill the day it is added.
 *
 * The model is not asked to design a deck. The methodology already decided
 * which slides exist and in what order; the model fills them in. That is the
 * difference between a tool that has an opinion and a tool that outsources one.
 */

/** Everything the model may write. Ids and notes are ours. */
const AUTHORED = { id: true, notes: true, hidden: true } as const;

const DraftSlide = z.discriminatedUnion('type', [
  CoverSlide.omit(AUTHORED),
  ProblemSlide.omit(AUTHORED),
  SolutionSlide.omit(AUTHORED),
  WhyNowSlide.omit(AUTHORED),
  MarketSlide.omit(AUTHORED),
  ProductSlide.omit(AUTHORED),
  TractionSlide.omit(AUTHORED),
  BusinessModelSlide.omit(AUTHORED),
  GoToMarketSlide.omit(AUTHORED),
  CompetitionSlide.omit(AUTHORED),
  TeamSlide.omit(AUTHORED),
  AskSlide.omit(AUTHORED),
]);
export type DraftSlide = z.infer<typeof DraftSlide>;

const DraftResult = z.object({
  /** One per methodology step, in the same order. */
  slides: z.array(DraftSlide),
  /**
   * Claims the brief did not support.
   *
   * A drafter that silently invents a revenue figure produces a deck that
   * fails in the room rather than in review, so anything the model had to
   * reach for is reported rather than buried.
   */
  assumptions: z.array(z.string()),
  /** What the author has to supply before this deck is sendable. */
  missing: z.array(z.string()),
});
export type DraftResult = z.infer<typeof DraftResult>;

export interface DraftInput {
  /** The founder's brief, an existing deck's text, notes: anything. */
  brief: string;
  company: string;
  methodologyId?: string;
  themeId?: string;
  title?: string;
  /** Extra direction from the author, e.g. "we are pre-revenue, say so". */
  guidance?: string;
}

export interface DraftOutput {
  deck: Deck;
  assumptions: string[];
  missing: string[];
}

function systemPrompt(methodologyId: string): string {
  const methodology = getMethodology(methodologyId);

  const steps = methodology.steps
    .map((step, index) => {
      const lines = [
        `${index + 1}. ${step.label}  [type: ${step.type}]`,
        `   Job: ${step.brief.job}`,
        ...step.brief.prompts.map((prompt) => `   - ${prompt}`),
      ];
      if (step.brief.test) lines.push(`   Test: ${step.brief.test}`);
      if (step.brief.warning) lines.push(`   Watch out: ${step.brief.warning}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const rules = methodology.rules.map((rule) => `- ${rule.rule}`).join('\n');

  return `You draft investor pitch decks. You are working in the ${methodology.name} framework (${methodology.source}).

${methodology.summary}

${UNTRUSTED_PREAMBLE}

# The slides, in order

${steps}

# Working rules

${rules}

# How to write

Write like the founder, not like a consultant. Short declarative sentences.
Numbers wherever the brief supplies one, names wherever it supplies one.

Title every slide with the conclusion that slide reaches, not its topic. "Gyms
already pay $400/mo to stop churn" is a title. "Market" is not.

No em dashes. No "leverage", "seamless", "robust", "cutting-edge",
"revolutionary", or "best-in-class". No sentence that would survive being
deleted.

# What you must not do

Never invent a number, a customer name, a date, or a credential. If the brief
does not supply one, leave the field empty and say what is missing. A deck with
a plausible invented revenue figure is worse than an empty one: it fails in the
room instead of in review, and it is the founder who has to answer for it.

If the brief is thin on a slide, write what it supports and list the gap. Do not
pad.

Return one entry per slide above, in that order, using the given type for each.`;
}

function userPrompt(input: DraftInput): string {
  const parts = [
    `Company: ${input.company}`,
    '',
    'The founder supplied this brief:',
    wrapUntrusted(input.brief, 'brief'),
  ];

  if (input.guidance) {
    parts.push('', 'The founder also asked for:', wrapUntrusted(input.guidance, 'guidance'));
  }

  parts.push(
    '',
    'Draft the deck. Fill in what the brief supports, leave the rest empty, and list what is missing.',
  );
  return parts.join('\n');
}

/**
 * Brief in, deck out.
 *
 * The result is parsed as a real Deck before it is returned, so a draft that
 * would not have survived a save never reaches the editor.
 */
export async function draftDeck(provider: ModelProvider, input: DraftInput): Promise<DraftOutput> {
  const methodologyId = input.methodologyId ?? 'house';
  const methodology = getMethodology(methodologyId);

  const result = await provider.structured({
    system: systemPrompt(methodologyId),
    user: userPrompt(input),
    schema: DraftResult,
    schemaName: 'deck_draft',
    effort: 'high',
  });

  const drafted = new Map<SlideType, DraftSlide[]>();
  for (const slide of result.value.slides) {
    const list = drafted.get(slide.type) ?? [];
    list.push(slide);
    drafted.set(slide.type, list);
  }

  // Walk the methodology rather than the model's answer, so a drafter that
  // skipped a slide or invented an extra one cannot change the deck's shape.
  const slides: Slide[] = [];
  for (const step of methodology.steps) {
    const next = drafted.get(step.type)?.shift();
    if (!next) continue;
    slides.push({ ...next, id: slideId(), notes: '', hidden: false } as Slide);
  }

  const deck = createDeck({
    title: input.title ?? `${input.company} ${methodology.name}`,
    company: { name: input.company },
    methodologyId,
    ...(input.themeId ? { themeId: input.themeId } : {}),
  });

  return {
    deck: parseDeck({ ...deck, slides }),
    assumptions: result.value.assumptions,
    missing: result.value.missing,
  };
}
