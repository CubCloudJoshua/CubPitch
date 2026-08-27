import type { Deck } from '@cubpitch/core';
import { z } from 'zod';
import { deckToText } from './critique.js';
import type { ModelProvider } from './provider.js';
import { UNTRUSTED_PREAMBLE, wrapUntrusted } from './untrusted.js';

/**
 * Objection prep.
 *
 * The deck is not the meeting. What decides the meeting is the twenty minutes
 * after the deck, and those questions are predictable from the deck itself:
 * every unsupported claim is a question, and every number invites the one
 * behind it.
 *
 * Answers are drafted only where the deck already contains the material. Where
 * it does not, the tool says what the founder needs to go find out, which is
 * the useful output: an invented answer is worse than a known gap, because the
 * founder will believe it until a partner does not.
 */

const Objection = z.object({
  question: z.string(),
  /** Why they are asking. The question behind the question. */
  behind: z.string(),
  /**
   * The answer the deck supports, or empty when it supports none.
   * Never a guess.
   */
  answer: z.string(),
  /** What the founder must find out before they can answer. Empty if covered. */
  needed: z.string(),
  /** Which slide prompts it. 0 for the deck as a whole. */
  slide: z.number().int().min(0),
  likelihood: z.enum(['certain', 'likely', 'possible']),
});
export type Objection = z.infer<typeof Objection>;

const QaResult = z.object({
  /** The three or four they will definitely ask, hardest first. */
  objections: z.array(Objection),
  /** Material worth having in an appendix because of what is above. */
  appendix: z.array(z.string()),
});
export type QaResult = z.infer<typeof QaResult>;

const SYSTEM = `You prepare founders for the question period after a pitch.

${UNTRUSTED_PREAMBLE}

# Your job

From the deck, produce the questions a partner will actually ask, hardest
first, and draft the answers the deck already supports.

The best questions come from the gaps: a claim with no evidence, a number with
no derivation, a competitor not mentioned, a metric conspicuously absent (a
traction slide with users but no revenue invites "what do they pay"), a use of
funds that does not reach the milestone it promises.

For each, say what is behind the question. "What is your CAC" is usually "do
you know whether this business works, or have you only sold it yourself".

# Answers

Draft an answer only from what is in the deck. If the deck does not support one,
leave the answer empty and say precisely what the founder has to find out. An
invented answer is worse than a known gap: the founder will believe it right up
until a partner does not.

Never invent a number, a customer, or a date.

# Style

The questions in a partner's voice, short and direct. The answers in the
founder's voice, in the first person plural, no more than three sentences.

No em dashes. No hedging. Do not reassure.`;

export interface QaInput {
  deck: Deck;
  /** "Healthcare-focused seed fund, partner is ex-operator." */
  audience?: string;
}

export async function prepareQa(provider: ModelProvider, input: QaInput): Promise<QaResult> {
  const parts = ['Prepare me for the questions after this deck.', '', wrapUntrusted(deckToText(input.deck), 'deck')];
  if (input.audience) {
    parts.push('', 'The room:', wrapUntrusted(input.audience, 'audience'));
  }

  const result = await provider.structured({
    system: SYSTEM,
    user: parts.join('\n'),
    schema: QaResult,
    schemaName: 'qa_prep',
    effort: 'high',
  });
  return result.value;
}
