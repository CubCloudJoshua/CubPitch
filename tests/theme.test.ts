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
