import { getMethodology, slideProse, slideTitle, visibleSlides, type Deck } from '@cubpitch/core';
import { z } from 'zod';
import type { ModelProvider } from './provider.js';
import { UNTRUSTED_PREAMBLE, wrapUntrusted } from './untrusted.js';

/**
 * Substantive critique.
 *
 * The structural review in `@cubpitch/core` answers "is the why-now slide
 * present and does it have a shift written in it". This answers "is that shift
 * actually a shift, or is it a trend that has been true for five years". The
 * two are complementary and must not be merged: one is deterministic, free, and
 * runs on every keystroke; the other costs a model call and is a judgement.
 *
 * The prompt is written to make the model a partner reading the deck cold, not
 * an encouraging coach. A critique that says everything is strong is a critique
 * nobody will run twice.
 */

const Finding = z.object({
  /** Slide number as shown in the deck, 1-based. 0 for the deck as a whole. */
  slide: z.number().int().min(0),
  severity: z.enum(['blocking', 'serious', 'minor']),
  /** What is wrong, in one sentence. */
  problem: z.string(),
  /** Why a partner would stop on it. */
  why: z.string(),
  /** What to do instead. Concrete enough to act on without another meeting. */
  fix: z.string(),
});
export type Finding = z.infer<typeof Finding>;

const CritiqueResult = z.object({
  /** The deck's argument as the reader received it, in two or three sentences. */
  readback: z.string(),
  /** The single thing most likely to lose the room. */
  biggestRisk: z.string(),
  findings: z.array(Finding),
  /** What is genuinely working. Short: this is not the point of the exercise. */
  strengths: z.array(z.string()),
});
export type CritiqueResult = z.infer<typeof CritiqueResult>;

const SYSTEM = `You are a partner at a venture fund reading a seed or Series A deck cold,
the way you would in the ten minutes before a meeting.

${UNTRUSTED_PREAMBLE}

# Your job

First, read the deck back: what is this company, who buys it, and why does it
win? State it in two or three sentences, as *you* received it, not as the deck
intended. If you cannot reconstruct the argument, that is itself the finding.

Then name what would stop you.

# What to look for

The claim with nothing behind it. A market number with no bottom-up path. A
"why now" that is a trend rather than a change. Traction that is activity
rather than revenue. A moat that is a feature. A competitor set that omits the
status quo. An ask whose use of funds does not add up to the milestone it
promises. Two slides making the same point. A number on one slide that
contradicts a number on another.

Cross-slide contradictions matter most and are the thing a checklist cannot
catch. Look for them specifically.

# How to write findings

Be specific and be blunt. "The market slide is weak" helps nobody. "The $4.1B
figure has no source and the beachhead is 38 buyers at $180K, which is $6.8M,
so the path between them is missing" is a finding.

Severity: blocking means you would pass on this alone. Serious means you would
ask about it and the answer would matter. Minor means it costs credibility but
not the meeting.

Do not pad the strengths list to soften the critique. Two or three real ones, or
none.

No em dashes. No hedging. Do not congratulate the founder.`;

export interface CritiqueInput {
  deck: Deck;
  /** Who is reading, if it changes what matters. "Healthcare-focused seed fund." */
  audience?: string;
}

/** Render the deck as the text a reader actually receives, slide by slide. */
export function deckToText(deck: Deck): string {
  const methodology = getMethodology(deck.methodologyId);
  const slides = visibleSlides(deck);

  const body = slides
    .map((slide, index) => {
      const step = methodology.steps.find((entry) => entry.type === slide.type);
      const heading = `--- Slide ${index + 1}: ${slideTitle(slide)} [${step?.label ?? slide.type}]`;
      return `${heading}\n${slideProse(slide).join('\n')}`;
    })
    .join('\n\n');

  return `Company: ${deck.company.name}\nFramework: ${methodology.name}\nSlides: ${slides.length}\n\n${body}`;
}

export async function critiqueDeck(provider: ModelProvider, input: CritiqueInput): Promise<CritiqueResult> {
  const parts = [
    'Read this deck and tell me what would stop you.',
    '',
    wrapUntrusted(deckToText(input.deck), 'deck'),
  ];
  if (input.audience) {
    parts.push('', 'You are reading as:', wrapUntrusted(input.audience, 'audience'));
  }

  const result = await provider.structured({
    system: SYSTEM,
    user: parts.join('\n'),
    schema: CritiqueResult,
    schemaName: 'deck_critique',
    effort: 'high',
  });
  return result.value;
}
