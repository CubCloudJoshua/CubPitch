import type { Theme } from './tokens.js';

/**
 * Contrast.
 *
 * A theme that renders muted grey on near-black passes design review on a
 * laptop and disappears on a projector in a lit room. That is a bug with a
 * number attached, not a matter of taste, so themes are checked against WCAG
 * contrast ratios the same way any other invariant is checked.
 *
 * Slide type is large, so the 3:1 large-text threshold is the honest bar for
 * headlines and stats; body and label text is held to 4.5:1.
 */

export const LARGE_TEXT_RATIO = 3;
export const BODY_TEXT_RATIO = 4.5;

export function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const int = Number.parseInt(value, 16);
  return [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff];
}

/** Relative luminance per WCAG 2.1. */
export function luminance(hex: string): number {
  const channels = parseHex(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

export interface ContrastIssue {
  pair: string;
  ratio: number;
  required: number;
}

/** Every foreground/background pair a slide actually puts together. */
export function checkContrast(theme: Theme): ContrastIssue[] {
  const { colors } = theme;
  const pairs: Array<[string, string, string, number]> = [
    ['ink on bg', colors.ink, colors.bg, BODY_TEXT_RATIO],
    ['ink on surface', colors.ink, colors.surface, BODY_TEXT_RATIO],
    ['inkMuted on bg', colors.inkMuted, colors.bg, BODY_TEXT_RATIO],
    ['inkMuted on surface', colors.inkMuted, colors.surface, BODY_TEXT_RATIO],
    ['accent on bg', colors.accent, colors.bg, LARGE_TEXT_RATIO],
    ['accentBright on bg', colors.accentBright, colors.bg, LARGE_TEXT_RATIO],
    ['accentInk on accent', colors.accentInk, colors.accent, BODY_TEXT_RATIO],
    ['positive on bg', colors.positive, colors.bg, LARGE_TEXT_RATIO],
    ['caution on bg', colors.caution, colors.bg, LARGE_TEXT_RATIO],
    ['negative on bg', colors.negative, colors.bg, LARGE_TEXT_RATIO],
  ];

  const issues: ContrastIssue[] = [];
  for (const [pair, foreground, background, required] of pairs) {
    const ratio = Math.round(contrastRatio(foreground, background) * 100) / 100;
    if (ratio < required) issues.push({ pair, ratio, required });
  }

  // Chart series are drawn as fills with no text on them, but a series that
  // vanishes into the background is still a series nobody can read.
  theme.colors.chart.forEach((color, index) => {
    const ratio = Math.round(contrastRatio(color, colors.bg) * 100) / 100;
    if (ratio < LARGE_TEXT_RATIO) {
      issues.push({ pair: `chart[${index}] on bg`, ratio, required: LARGE_TEXT_RATIO });
    }
  });

  return issues;
}
