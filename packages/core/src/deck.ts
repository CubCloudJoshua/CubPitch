import { z } from 'zod';
import { MediaRef } from './blocks.js';
import { isSafeId } from './ids.js';
import { Slide } from './slide.js';

/**
 * The deck document.
 *
 * This is the whole product in one object: it is what the editor mutates, what
 * the file store persists, what the renderer draws, and what both exporters
 * read. Nothing downstream is allowed to hold state the deck does not.
 */

/** Bumped only when a change cannot be read by the previous reader. */
export const SCHEMA_VERSION = 1;

export const Company = z.object({
  name: z.string().min(1),
  tagline: z.string().default(''),
  website: z.string().default(''),
  location: z.string().default(''),
  sector: z.string().default(''),
  logo: MediaRef.optional(),
});
export type Company = z.infer<typeof Company>;

export const RaiseStage = z.enum([
  'pre-seed',
  'seed',
  'series-a',
  'series-b',
  'series-c',
  'growth',
  'internal',
]);
export type RaiseStage = z.infer<typeof RaiseStage>;

export const DeckMeta = z.object({
  stage: RaiseStage.default('seed'),
  /** Free text so "$3M on a SAFE" survives the round trip. */
  raise: z.string().default(''),
  audience: z.string().default(''),
  /** Stamped into the footer of every slide when set. */
  confidentiality: z.string().default('Confidential'),
  /** Deck-wide footer, e.g. "CubCloud AI · 2026". Empty hides the footer. */
  footer: z.string().default(''),
  showSlideNumbers: z.boolean().default(true),
});
export type DeckMeta = z.infer<typeof DeckMeta>;

export const Deck = z.object({
  /**
   * Constrained rather than merely non-empty. A deck id becomes a directory
   * name and a URL segment, so one containing `..` or a slash would let a
   * request write and delete outside the deck store.
   */
  id: z.string().refine(isSafeId, 'Deck id must be letters, digits, underscore or hyphen'),
  schemaVersion: z.number().int().positive().default(SCHEMA_VERSION),
  title: z.string().min(1),
  company: Company,
  /** Id into the theme registry. Swapping it re-skins every slide. */
  themeId: z.string().min(1).default('cubcloud'),
  /**
   * Which pitch methodology this deck is written against. It decides the
   * starter flow, the language the editor uses for each slide, and what the
   * review counts as missing. Changing it never rewrites content.
   */
  methodologyId: z.string().min(1).default('house'),
  meta: DeckMeta.prefault({}),
  slides: z.array(Slide).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type Deck = z.infer<typeof Deck>;

/** Slides that actually present: hidden ones stay in the document, not the show. */
export function visibleSlides(deck: Deck): Slide[] {
  return deck.slides.filter((slide) => !slide.hidden);
}

export function findSlide(deck: Deck, slideId: string): Slide | undefined {
  return deck.slides.find((slide) => slide.id === slideId);
}

export function slideIndex(deck: Deck, slideId: string): number {
  return deck.slides.findIndex((slide) => slide.id === slideId);
}
