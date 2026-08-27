import { z } from 'zod';
import { Deck, SCHEMA_VERSION } from './deck.js';
import { Slide } from './slide.js';

/**
 * Parsing.
 *
 * This module decides whether a document is structurally legal. Whether it is
 * any *good* is `review.ts`, and the split matters: parsing rejects, review
 * only ever warns.
 */

export class DeckParseError extends Error {
  constructor(
    message: string,
    readonly issues: z.core.$ZodIssue[],
  ) {
    super(message);
    this.name = 'DeckParseError';
  }
}

export function parseDeck(input: unknown): Deck {
  const result = Deck.safeParse(migrate(input));
  if (!result.success) {
    const summary = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new DeckParseError(
      `Deck is not valid: ${summary}${result.error.issues.length > 5 ? ` (+${result.error.issues.length - 5} more)` : ''}`,
      result.error.issues,
    );
  }
  return result.data;
}

export function safeParseDeck(input: unknown): z.ZodSafeParseResult<Deck> {
  return Deck.safeParse(migrate(input));
}

export function parseSlide(input: unknown): Slide {
  return Slide.parse(input);
}

/**
 * Bring an older document up to the current schema.
 *
 * There is one version so far and nothing to do, but the seam exists before it
 * is needed: the alternative is discovering on the day of a schema change that
 * every stored deck has to be migrated by hand.
 */
function migrate(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input;
  const doc = input as Record<string, unknown>;
  const version = typeof doc['schemaVersion'] === 'number' ? doc['schemaVersion'] : SCHEMA_VERSION;
  if (version > SCHEMA_VERSION) {
    throw new DeckParseError(
      `Deck was written by a newer version of CubPitch (schema ${version}, this build reads ${SCHEMA_VERSION}).`,
      [],
    );
  }
  return doc;
}
