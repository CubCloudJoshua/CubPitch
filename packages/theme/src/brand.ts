import type { Brand, Deck } from '@cubpitch/core';
import { contrastRatio, parseHex } from './contrast.js';
import { getTheme } from './themes.js';
import type { Theme } from './tokens.js';

/**
 * Applying a brand to a base theme.
 *
 * The author supplies one colour. Everything accent-shaped is derived from it,
 * so a brand cannot leave the deck in a half-branded state where the accent is
 * the company's but the text drawn on it is still the base theme's and now
 * unreadable. The base theme keeps the ground, the type and the layout, which
 * is what stops one bad colour from breaking a deck.
 */

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Move a colour toward white (positive) or black (negative) by a fraction. */
function shade(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex([r + (target - r) * t, g + (target - g) * t, b + (target - b) * t]);
}

/** Black or white, whichever reads better on the given colour. */
function inkOn(hex: string): string {
  return contrastRatio('#ffffff', hex) >= contrastRatio('#111111', hex) ? '#F5F5F5' : '#111111';
}

/** Normalise to a leading hash so the rest of the pipeline sees one shape. */
function normalize(hex: string): string {
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/**
 * A theme with the brand's accent worked through it.
 *
 * The bright accent lifts the accent toward white for hover and small text; the
 * ink is the auto-contrast choice unless overridden; and the first chart series
 * becomes the accent so a branded deck's charts are branded too. When the brand
 * carries no accent, the base theme is returned untouched.
 */
export function resolveTheme(base: Theme, brand?: Brand): Theme {
  if (!brand?.accent) return base;

  const accent = normalize(brand.accent);
  const accentBright = brand.accentBright ? normalize(brand.accentBright) : shade(accent, 0.18);
  const accentInk = brand.accentInk ? normalize(brand.accentInk) : inkOn(accent);

  return {
    ...base,
    colors: {
      ...base.colors,
      accent,
      accentBright,
      accentInk,
      chart: [accent, ...base.colors.chart.slice(1)],
    },
  };
}

/** The theme a deck actually renders in: its base theme plus its brand. */
export function themeForDeck(deck: Pick<Deck, 'themeId' | 'brand'>): Theme {
  return resolveTheme(getTheme(deck.themeId), deck.brand);
}
