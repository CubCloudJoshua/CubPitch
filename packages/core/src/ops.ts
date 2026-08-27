import { Deck } from './deck.js';
import { slideId as newSlideId } from './ids.js';
import type { Slide, SlideType } from './slide.js';
import { emptySlide } from './defaults.js';

/**
 * Deck operations.
 *
 * Every operation returns a new deck and stamps `updatedAt`. The editor's undo
 * stack is a list of previous decks, which only works because nothing here
 * mutates in place.
 */

function touch(deck: Deck): Deck {
  return { ...deck, updatedAt: new Date().toISOString() };
}

function withSlides(deck: Deck, slides: Slide[]): Deck {
  return touch({ ...deck, slides });
}

/** Insert at `index`, or append when `index` is omitted or out of range. */
export function insertSlide(deck: Deck, slide: Slide, index?: number): Deck {
  const slides = [...deck.slides];
  const at = index === undefined ? slides.length : clamp(index, 0, slides.length);
  slides.splice(at, 0, slide);
  return withSlides(deck, slides);
}

export function addSlide(deck: Deck, type: SlideType, index?: number): Deck {
  return insertSlide(deck, emptySlide(type), index);
}

export function removeSlide(deck: Deck, id: string): Deck {
  return withSlides(
    deck,
    deck.slides.filter((slide) => slide.id !== id),
  );
}

/**
 * Replace a slide with an edited copy.
 *
 * `patch` cannot change `type`: a problem slide and a financials slide do not
 * share a field set, so switching type is a delete plus an insert, not a patch.
 */
export function updateSlide<S extends Slide>(
  deck: Deck,
  id: string,
  patch: Partial<Omit<S, 'id' | 'type'>>,
): Deck {
  return withSlides(
    deck,
    deck.slides.map((slide) => (slide.id === id ? ({ ...slide, ...patch } as Slide) : slide)),
  );
}

/** Move a slide to an absolute position. Out-of-range targets clamp. */
export function moveSlide(deck: Deck, id: string, toIndex: number): Deck {
  const from = deck.slides.findIndex((slide) => slide.id === id);
  if (from === -1) return deck;
  const slides = [...deck.slides];
  const [moved] = slides.splice(from, 1);
  if (!moved) return deck;
  slides.splice(clamp(toIndex, 0, slides.length), 0, moved);
  return withSlides(deck, slides);
}

export function duplicateSlide(deck: Deck, id: string): Deck {
  const index = deck.slides.findIndex((slide) => slide.id === id);
  const source = deck.slides[index];
  if (!source) return deck;
  return insertSlide(deck, { ...source, id: newSlideId() }, index + 1);
}

export function toggleHidden(deck: Deck, id: string): Deck {
  return withSlides(
    deck,
    deck.slides.map((slide) => (slide.id === id ? { ...slide, hidden: !slide.hidden } : slide)),
  );
}

export function setTheme(deck: Deck, themeId: string): Deck {
  return touch({ ...deck, themeId });
}

/**
 * Reorder to an explicit id sequence, as produced by a drag in the slide rail.
 *
 * Ids missing from `order` keep their relative order at the end rather than
 * being dropped: a rail that renders a subset must never delete the rest.
 */
export function reorderSlides(deck: Deck, order: string[]): Deck {
  const byId = new Map(deck.slides.map((slide) => [slide.id, slide]));
  const ordered: Slide[] = [];
  for (const id of order) {
    const slide = byId.get(id);
    if (slide) {
      ordered.push(slide);
      byId.delete(id);
    }
  }
  return withSlides(deck, [...ordered, ...byId.values()]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
