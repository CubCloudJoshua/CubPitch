import { Deck, SCHEMA_VERSION, type Company, type DeckMeta } from './deck.js';
import { emptySlide } from './defaults.js';
import { deckId, slideId } from './ids.js';
import { DEFAULT_METHODOLOGY_ID, getMethodology } from './methodology.js';
import type { Slide } from './slide.js';

/**
 * Deck construction.
 *
 * `createDeck` builds a valid empty document. `starterDeck` builds the chosen
 * methodology's flow, so a new deck opens as a structure to fill in rather than
 * a blank canvas. The order is the argument, and it is the methodology's
 * argument rather than ours: Y Combinator puts traction fourth, Sequoia puts
 * "why now" fourth, and a deck started under either should say so.
 */

export interface CreateDeckInput {
  title: string;
  company: Partial<Company> & { name: string };
  themeId?: string;
  methodologyId?: string;
  meta?: Partial<DeckMeta>;
  slides?: Slide[];
}

export function createDeck(input: CreateDeckInput): Deck {
  const now = new Date().toISOString();
  return Deck.parse({
    id: deckId(),
    schemaVersion: SCHEMA_VERSION,
    title: input.title,
    company: input.company,
    themeId: input.themeId ?? 'cubcloud',
    methodologyId: input.methodologyId ?? DEFAULT_METHODOLOGY_ID,
    meta: input.meta ?? {},
    slides: input.slides ?? [],
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * A deck laid out as its methodology's flow, with each slide titled by that
 * methodology's own name for it. The titles are placeholders an author is
 * meant to replace with a conclusion, which is exactly what the review will
 * tell them once they run it.
 */
export function starterDeck(input: CreateDeckInput): Deck {
  const deck = createDeck(input);
  const methodology = getMethodology(deck.methodologyId);

  const slides = methodology.steps.map((step) => {
    const slide = emptySlide(step.type);
    if ('title' in slide && typeof slide.title === 'string') slide.title = step.label;
    return slide;
  });

  const cover = slides[0];
  if (cover?.type === 'cover') {
    cover.headline = deck.company.name;
    cover.oneLiner = deck.company.tagline;
    if (deck.company.logo) cover.logo = deck.company.logo;
  }

  // A closing slide is a courtesy, not a step, so it is only added where the
  // methodology has room for it. Kawasaki says ten slides and means ten; a
  // starter deck that ships eleven is the tool arguing with its own advice.
  if (slides.length < methodology.targetSlides.max) {
    slides.push({
      id: slideId(),
      type: 'closing',
      notes: '',
      hidden: false,
      headline: 'Thank you',
      subhead: '',
      website: deck.company.website,
    });
  }

  return { ...deck, slides };
}
