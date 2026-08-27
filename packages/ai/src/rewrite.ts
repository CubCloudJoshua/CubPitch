import {
  getMethodology,
  slideProse,
  slideTitle,
  stepFor,
  updateSlide,
  visibleSlides,
  type Deck,
  type Slide,
} from '@cubpitch/core';
import { z } from 'zod';
import type { ModelProvider } from './provider.js';
import { UNTRUSTED_PREAMBLE, wrapUntrusted } from './untrusted.js';

/**
 * Rewriting one slide.
 *
 * The narrow scope is the feature. Regenerating a whole deck to fix one slide
 * throws away every other edit the author has made, so this changes exactly one
 * slide and leaves its type alone: a problem slide comes back a problem slide,
 * with the same fields, rewritten.
 *
 * The rest of the deck goes in as context but not as something to change. A
 * rewrite that does not know what the next slide already says will repeat it.
 */

/**
 * The model answers with field values, not a slide object.
 *
 * Asking for the whole slide invites it to change the type or invent a field.
 * A map of field name to new text can only ever edit what is already there, and
 * anything unrecognised is dropped on the way in.
 */
const RewriteResult = z.object({
  /** Field name to new value. Strings only; lists are joined by the caller. */
  fields: z.record(z.string(), z.string()),
  /** What changed and why, in one line, so the author can judge it. */
  rationale: z.string(),
  /** Anything the rewrite needed and the deck did not supply. */
  needed: z.array(z.string()).default([]),
});
export type RewriteResult = z.infer<typeof RewriteResult>;

export interface RewriteInput {
  deck: Deck;
  slideId: string;
  /** "Tighter", "this is two ideas", "lead with the number". Optional. */
  instruction?: string;
}

export interface RewriteOutput {
  /** The deck with the one slide replaced. */
  deck: Deck;
  slide: Slide;
  rationale: string;
  needed: string[];
  /** Field names the model returned that the slide does not have. */
  ignored: string[];
}

const SYSTEM = `You rewrite a single slide in an investor pitch deck.

${UNTRUSTED_PREAMBLE}

# Rules

Change only the fields you are given. Do not add fields, do not rename them, and
do not change what kind of slide this is.

Return only the fields you actually changed. A field you leave out keeps its
current value, which is the right outcome for anything already working.

Never invent a number, a customer name, a date, or a credential. If the rewrite
would be better with one the deck does not contain, leave the text without it and
say what you needed.

# Style

Write like the founder. Short declarative sentences. Numbers where the deck
supplies one, names where it supplies one. Cut every word that could go.

Title the slide with the conclusion it reaches, not its topic.

No em dashes. No "leverage", "seamless", "robust", "cutting-edge",
"revolutionary", or "best-in-class".

The rest of the deck is given for context. Do not repeat what a later slide
already says.`;

/** Every string field on a slide the model is allowed to touch. */
function editableFields(slide: Slide): Record<string, string> {
  const skip = new Set(['id', 'type', 'notes', 'hidden']);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(slide)) {
    if (skip.has(key)) continue;
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

export async function rewriteSlide(provider: ModelProvider, input: RewriteInput): Promise<RewriteOutput> {
  const slide = input.deck.slides.find((entry) => entry.id === input.slideId);
  if (!slide) throw new Error(`Slide ${input.slideId} is not in deck ${input.deck.id}`);

  const methodology = getMethodology(input.deck.methodologyId);
  const step = stepFor(methodology, slide.type);
  const fields = editableFields(slide);

  const context = visibleSlides(input.deck)
    .map((entry, index) => `${index + 1}. ${slideTitle(entry)}${entry.id === slide.id ? '   <-- the one to rewrite' : ''}`)
    .join('\n');

  const parts = [
    `Framework: ${methodology.name}`,
    step ? `This slide is the ${step.label}. Its job: ${step.brief.job}` : `Slide type: ${slide.type}`,
    step?.brief.warning ? `Watch out: ${step.brief.warning}` : '',
    '',
    'The deck, for context:',
    wrapUntrusted(context, 'deck outline'),
    '',
    'Everything currently on the slide:',
    wrapUntrusted(slideProse(slide).join('\n'), 'slide'),
    '',
    'The fields you may change, with their current values:',
    wrapUntrusted(JSON.stringify(fields, null, 2), 'fields'),
  ];

  if (input.instruction) {
    parts.push('', 'The author asked for:', wrapUntrusted(input.instruction, 'instruction'));
  }

  const result = await provider.structured({
    system: SYSTEM,
    user: parts.filter(Boolean).join('\n'),
    schema: RewriteResult,
    schemaName: 'slide_rewrite',
    effort: 'high',
    maxTokens: 8_000,
  });

  // Only fields the slide actually has, and only strings. A model that invents
  // a field name must not be able to widen the document.
  const patch: Record<string, string> = {};
  const ignored: string[] = [];
  for (const [key, value] of Object.entries(result.value.fields)) {
    // hasOwn, not `in`: `in` walks the prototype chain, so `constructor` and
    // `toString` would pass a guard meant to mean "a field this slide has".
    if (Object.hasOwn(fields, key)) patch[key] = value;
    else ignored.push(key);
  }

  const deck = updateSlide(input.deck, slide.id, patch);
  const updated = deck.slides.find((entry) => entry.id === slide.id)!;

  return {
    deck,
    slide: updated,
    rationale: result.value.rationale,
    needed: result.value.needed,
    ignored,
  };
}
