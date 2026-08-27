import type { Deck } from '@cubpitch/core';

/**
 * Deck storage.
 *
 * Two implementations, one interface, and the choice is deployment rather than
 * architecture. The file store needs no infrastructure and is what makes the
 * tool usable the day it is cloned; Postgres is what makes it usable by a team.
 * Nothing above this interface knows which one it has.
 */

export interface DeckSummary {
  id: string;
  title: string;
  company: string;
  themeId: string;
  methodologyId: string;
  slideCount: number;
  updatedAt: string;
}

/** A saved point in a deck's history. */
export interface DeckVersion {
  version: number;
  savedAt: string;
  /** Why this version exists: "before theme change", "sent to Sequoia". */
  note: string;
}

export interface DeckStore {
  list(): Promise<DeckSummary[]>;
  get(id: string): Promise<Deck | null>;
  /**
   * Write a deck.
   *
   * `expectedUpdatedAt` is optimistic concurrency: pass the `updatedAt` the
   * caller last read and the write fails if someone else saved in between.
   * Two people editing the deck the night before a raise is the normal case,
   * not the exotic one.
   */
  put(deck: Deck, options?: { expectedUpdatedAt?: string; note?: string }): Promise<Deck>;
  delete(id: string): Promise<void>;
  versions(id: string): Promise<DeckVersion[]>;
  getVersion(id: string, version: number): Promise<Deck | null>;
  close?(): Promise<void>;
}

/** Thrown when a concurrent write would be silently overwritten. */
export class ConcurrentWriteError extends Error {
  constructor(
    readonly deckId: string,
    readonly expected: string,
    readonly actual: string,
  ) {
    super(
      `Deck ${deckId} changed since you loaded it (expected ${expected}, found ${actual}). ` +
        'Reload and reapply your edit rather than overwriting the other change.',
    );
    this.name = 'ConcurrentWriteError';
  }
}

export class DeckNotFoundError extends Error {
  constructor(readonly deckId: string) {
    super(`No deck with id ${deckId}`);
    this.name = 'DeckNotFoundError';
  }
}

export function summarise(deck: Deck): DeckSummary {
  return {
    id: deck.id,
    title: deck.title,
    company: deck.company.name,
    themeId: deck.themeId,
    methodologyId: deck.methodologyId,
    slideCount: deck.slides.length,
    updatedAt: deck.updatedAt,
  };
}
