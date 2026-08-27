import { parseInline } from '@cubpitch/core';
import type { Theme } from '@cubpitch/theme';
import { pxToInches, pxToPoints } from '@cubpitch/theme';
import type { PptxTextOptions, PptxTextRun } from './pptx-api.js';

/**
 * PowerPoint layout helpers.
 *
 * The web renderer lays out with flexbox; PowerPoint has absolute boxes and
 * nothing else. Rather than reimplement flexbox, this module reproduces the
 * *rhythm* of the CSS: the same padding, the same type scale, the same colours,
 * the same accent hairline. The result is not pixel-identical to the PDF and is
 * not trying to be. It is a deck a partner can open in PowerPoint and edit,
 * which is the only reason to emit .pptx at all.
 *
 * Everything is expressed in slide pixels and converted once, on the way out.
 */

/** pptxgenjs wants hex without the hash. */
export function hex(color: string): string {
  return color.replace('#', '').toUpperCase();
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Slide-pixel box to the inches pptxgenjs expects. */
export function inches(box: Box): { x: number; y: number; w: number; h: number } {
  return { x: pxToInches(box.x), y: pxToInches(box.y), w: pxToInches(box.w), h: pxToInches(box.h) };
}

export class SlideLayout {
  readonly pad: number;
  readonly width: number;
  readonly height: number;
  /** Vertical cursor, in slide pixels, so sections stack like the CSS does. */
  private cursor: number;

  constructor(readonly theme: Theme, width = 1920, height = 1080) {
    this.pad = theme.pad;
    this.width = width;
    this.height = height;
    this.cursor = theme.pad;
  }

  get contentWidth(): number {
    return this.width - this.pad * 2;
  }

  get y(): number {
    return this.cursor;
  }

  /** Reserve vertical space and return the box that was reserved. */
  take(height: number, gap = 0): Box {
    const box = { x: this.pad, y: this.cursor, w: this.contentWidth, h: height };
    this.cursor += height + gap;
    return box;
  }

  moveTo(y: number): void {
    this.cursor = y;
  }

  /** Split a box into evenly spaced columns. */
  columns(box: Box, count: number, gap = 40): Box[] {
    const width = (box.w - gap * (count - 1)) / count;
    return Array.from({ length: count }, (_, index) => ({
      x: box.x + (width + gap) * index,
      y: box.y,
      w: width,
      h: box.h,
    }));
  }
}

/** Inline markup to PowerPoint text runs, so bold survives the trip. */
export function textRuns(input: string, base: PptxTextOptions): PptxTextRun[] {
  const runs = parseInline(input);
  if (runs.length === 0) return [{ text: '', options: base }];
  return runs.map((run) => ({
    text: run.text,
    options: { ...base, bold: run.bold || base.bold, italic: run.italic || base.italic },
  }));
}

export interface TypeStyle {
  fontSize: number;
  fontFace: string;
  color: string;
  bold?: boolean;
  charSpacing?: number;
  lineSpacingMultiple?: number;
}

/**
 * The type scale, translated.
 *
 * `minFontPt` is Kawasaki's third number. When a methodology sets it, no text
 * in the exported deck goes below it, which is the whole point of the rule: it
 * forces the author to cut until only the argument is left.
 */
export function typeScale(theme: Theme, minFontPt?: number): Record<string, TypeStyle> {
  const clamp = (pt: number): number => (minFontPt ? Math.max(pt, minFontPt) : pt);
  const display = theme.fonts.pptxDisplay;
  const body = theme.fonts.pptxBody;

  return {
    hero: { fontSize: clamp(pxToPoints(theme.type.hero)), fontFace: display, color: hex(theme.colors.ink), bold: true },
    title: { fontSize: clamp(pxToPoints(theme.type.title)), fontFace: display, color: hex(theme.colors.ink), bold: true },
    display: { fontSize: clamp(pxToPoints(theme.type.display)), fontFace: display, color: hex(theme.colors.accent), bold: true },
    lead: { fontSize: clamp(pxToPoints(theme.type.lead)), fontFace: body, color: hex(theme.colors.inkMuted) },
    body: { fontSize: clamp(pxToPoints(theme.type.body)), fontFace: body, color: hex(theme.colors.ink) },
    small: { fontSize: clamp(pxToPoints(theme.type.small)), fontFace: body, color: hex(theme.colors.inkMuted) },
    label: {
      fontSize: clamp(pxToPoints(theme.type.label)),
      fontFace: body,
      color: hex(theme.colors.inkMuted),
      charSpacing: theme.type.labelTracking * pxToPoints(theme.type.label),
    },
    stat: { fontSize: clamp(pxToPoints(theme.type.stat)), fontFace: display, color: hex(theme.colors.accentBright), bold: true },
  };
}

/**
 * Derive a size from an existing style.
 *
 * The floor has to be re-applied here, not just where the scale is built.
 * Clamping once at construction and then multiplying by 0.55 for a smaller
 * stat puts 29.7pt on a slide in a methodology that promised nothing under 30,
 * and the tool has quietly broken the rule it is selling.
 */
export function scaleStyle(style: TypeStyle, factor: number, minFontPt?: number): TypeStyle {
  const size = style.fontSize * factor;
  return { ...style, fontSize: minFontPt ? Math.max(size, minFontPt) : size };
}

/** Labels render uppercase in the CSS; PowerPoint has no text-transform. */
export function labelText(theme: Theme, text: string): string {
  return theme.type.labelUppercase ? text.toUpperCase() : text;
}
