import { describe, expect, it } from 'vitest';
import {
  addSlide,
  createDeck,
  duplicateSlide,
  emptySlide,
  moveSlide,
  parseDeck,
  removeSlide,
  reorderSlides,
  starterDeck,
  updateSlide,
} from '@cubpitch/core';

const company = { name: 'CubCloud', tagline: 'Sovereign AI infrastructure in Montana' };

describe('deck operations', () => {
  it('never mutates the deck it was given', () => {
    // The editor's undo stack is a list of previous decks. If an operation
    // mutated in place, undo would silently restore the edited state.
    const deck = starterDeck({ title: 'Seed', company });
    const before = structuredClone(deck);
    const first = deck.slides[0];
    if (!first) throw new Error('starter deck is empty');

    addSlide(deck, 'quote');
    removeSlide(deck, first.id);
    moveSlide(deck, first.id, 4);
    updateSlide(deck, first.id, { notes: 'changed' });

    expect(deck).toEqual(before);
  });

  it('keeps slides the caller forgot to list when reordering', () => {
    // A rail that renders a filtered subset must never delete the rest.
    const deck = starterDeck({ title: 'Seed', company });
    const ids = deck.slides.map((slide) => slide.id);
    const partial = [ids[3]!, ids[0]!];

    const reordered = reorderSlides(deck, partial);

    expect(reordered.slides).toHaveLength(deck.slides.length);
    expect(reordered.slides.slice(0, 2).map((slide) => slide.id)).toEqual(partial);
    expect(new Set(reordered.slides.map((slide) => slide.id))).toEqual(new Set(ids));
  });

  it('gives a duplicated slide a fresh id', () => {
    // Two slides sharing an id makes every later edit hit both.
    const deck = starterDeck({ title: 'Seed', company });
    const source = deck.slides[1]!;
    const result = duplicateSlide(deck, source.id);
    const copy = result.slides[2]!;

    expect(result.slides).toHaveLength(deck.slides.length + 1);
    expect(copy.id).not.toBe(source.id);
    expect(copy.type).toBe(source.type);
  });

  it('clamps a move past the end instead of dropping the slide', () => {
    const deck = starterDeck({ title: 'Seed', company });
    const id = deck.slides[0]!.id;
    const moved = moveSlide(deck, id, 999);
    expect(moved.slides).toHaveLength(deck.slides.length);
    expect(moved.slides.at(-1)!.id).toBe(id);
  });

  it('round-trips every slide type through parse', () => {
    // Export and storage both re-parse. A type that cannot survive the round
    // trip is a type that corrupts a deck on save.
    const deck = createDeck({ title: 'All types', company });
    const withEvery = {
      ...deck,
      slides: [
        'cover', 'problem', 'solution', 'whyNow', 'market', 'product', 'traction',
        'businessModel', 'goToMarket', 'competition', 'team', 'ask', 'agenda',
        'section', 'statement', 'howItWorks', 'metrics', 'moat', 'roadmap',
        'financials', 'useOfFunds', 'logos', 'quote', 'closing', 'bullets', 'image',
      ].map((type) => emptySlide(type as never)),
    };

    const parsed = parseDeck(JSON.parse(JSON.stringify(withEvery)));
    expect(parsed.slides).toHaveLength(26);
    expect(parsed.slides.map((slide) => slide.type)).toEqual(withEvery.slides.map((slide) => slide.type));
  });

  it('refuses a deck written by a newer schema', () => {
    const deck = createDeck({ title: 'Future', company });
    expect(() => parseDeck({ ...deck, schemaVersion: 99 })).toThrow(/newer version/i);
  });
});
