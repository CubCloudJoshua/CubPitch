import { describe, expect, it } from 'vitest';
import {
  BODY_TEXT_RATIO,
  checkContrast,
  contrastRatio,
  getTheme,
  pxToInches,
  pxToPoints,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  THEMES,
} from '@cubpitch/theme';

describe('theme geometry', () => {
  it('maps slide pixels onto PowerPoint inches exactly', () => {
    // The whole exporter rests on this identity. If it drifts, every PowerPoint
    // slide is subtly the wrong size and nobody notices until a partner opens one.
    expect(pxToInches(SLIDE_WIDTH)).toBeCloseTo(13.333, 3);
    expect(pxToInches(SLIDE_HEIGHT)).toBe(7.5);
    expect(pxToPoints(60)).toBe(30);
  });

  it('keeps the canvas at 16:9', () => {
    expect(SLIDE_WIDTH / SLIDE_HEIGHT).toBeCloseTo(16 / 9, 5);
  });
});

describe('contrast', () => {
  it('computes known WCAG ratios', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeGreaterThan(4);
  });

  it('every shipped theme is legible', () => {
    // A theme that renders muted grey on near-black passes on a laptop and
    // disappears on a projector. This is the check that catches it.
    for (const theme of THEMES) {
      const issues = checkContrast(theme);
      expect(issues, `${theme.name}: ${issues.map((i) => `${i.pair} ${i.ratio}:1 < ${i.required}:1`).join(', ')}`).toEqual([]);
    }
  });

  it('catches a theme that is not legible', () => {
    const broken = { ...getTheme('cubcloud') };
    broken.colors = { ...broken.colors, inkMuted: '#151515' };
    const issues = checkContrast(broken);
    expect(issues.some((issue) => issue.pair.startsWith('inkMuted'))).toBe(true);
    expect(issues[0]!.required).toBe(BODY_TEXT_RATIO);
  });
});

describe('theme registry', () => {
  it('falls back to CubCloud for an unknown id', () => {
    expect(getTheme('nope').id).toBe('cubcloud');
  });

  it('names PowerPoint-safe fallback fonts', () => {
    // A .pptx carries no fonts. Naming a face the recipient lacks means
    // PowerPoint substitutes silently and the layout moves.
    for (const theme of THEMES) {
      expect(theme.fonts.pptxDisplay).not.toMatch(/Bebas|Fraunces|JetBrains|IBM Plex/);
      expect(theme.fonts.pptxBody).not.toMatch(/Bebas|Fraunces|JetBrains|IBM Plex/);
    }
  });
});

describe('brand overrides', () => {
  it('derives a full accent set from one colour', async () => {
    const { resolveTheme } = await import('@cubpitch/theme');
    const base = getTheme('cubcloud');
    const branded = resolveTheme(base, { accent: '#1668b0' });

    expect(branded.colors.accent).toBe('#1668b0');
    // The bright accent is lifted toward white, the ink is auto-contrast, and
    // the first chart series takes the brand colour.
    expect(branded.colors.accentBright).not.toBe(base.colors.accentBright);
    expect(['#F5F5F5', '#111111']).toContain(branded.colors.accentInk);
    expect(branded.colors.chart[0]).toBe('#1668b0');
    // Everything else is the base theme: a brand cannot break the layout.
    expect(branded.colors.bg).toBe(base.colors.bg);
    expect(branded.fonts).toEqual(base.fonts);
  });

  it('returns the base theme untouched when there is no brand', async () => {
    const { resolveTheme, themeForDeck } = await import('@cubpitch/theme');
    const base = getTheme('cubcloud');
    expect(resolveTheme(base, undefined)).toBe(base);
    expect(themeForDeck({ themeId: 'cubcloud' }).colors.accent).toBe(base.colors.accent);
  });

  it('chooses readable ink for a light and a dark brand colour', async () => {
    const { resolveTheme } = await import('@cubpitch/theme');
    const base = getTheme('cubcloud');
    // A pale brand colour needs dark ink; a deep one needs light ink.
    expect(resolveTheme(base, { accent: '#FFE08A' }).colors.accentInk).toBe('#111111');
    expect(resolveTheme(base, { accent: '#0B1B4D' }).colors.accentInk).toBe('#F5F5F5');
  });

  it('respects an explicit accentInk override', async () => {
    const { resolveTheme } = await import('@cubpitch/theme');
    const branded = resolveTheme(getTheme('cubcloud'), { accent: '#1668b0', accentInk: '#FFEEDD' });
    expect(branded.colors.accentInk).toBe('#FFEEDD');
  });
});
