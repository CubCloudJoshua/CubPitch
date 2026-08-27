import { z } from 'zod';

/**
 * Theme tokens.
 *
 * One token set drives three renderers: the browser, the PDF (which is the
 * browser), and PowerPoint (which is not). Anything a theme declares therefore
 * has to survive translation into a world with no CSS, which is why sizes are
 * plain numbers in slide pixels and colours are plain hex.
 *
 * The canvas is 1920x1080 and PowerPoint's is 13.333x7.5 inches, so one slide
 * pixel is exactly 1/144 inch and one point is exactly two slide pixels. Every
 * conversion in the exporter is that identity and nothing else.
 */

/** Slide pixels per inch. 1920 / 13.333in. */
export const PX_PER_INCH = 144;
/** Slide pixels per point. 144 / 72. */
export const PX_PER_PT = 2;

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

export function pxToInches(px: number): number {
  return px / PX_PER_INCH;
}

export function pxToPoints(px: number): number {
  return px / PX_PER_PT;
}

/** Six-digit hex without the hash, which is what PowerPoint wants. */
const HexColor = z.string().regex(/^#?[0-9a-fA-F]{6}$/u).transform((value) => (value.startsWith('#') ? value : `#${value}`));

export const ThemeColors = z.object({
  /** Slide background. */
  bg: HexColor,
  /** Raised panels: stat tiles, table headers, cards. */
  surface: HexColor,
  /** A second panel tone for banding and alternating rows. */
  surfaceAlt: HexColor,
  /** Hairlines and dividers. */
  border: HexColor,
  /** Primary text. */
  ink: HexColor,
  /** Secondary text: labels, captions, sources. */
  inkMuted: HexColor,
  /** The single accent. */
  accent: HexColor,
  /** Brighter accent for hover, emphasis, and small text on dark. */
  accentBright: HexColor,
  /** Text drawn on top of an accent fill. */
  accentInk: HexColor,
  /** Categorical series colours. Charts cycle through these in order. */
  chart: z.array(HexColor).min(3),
  /** Positive, caution, negative. Deliberately desaturated to stay coherent. */
  positive: HexColor,
  caution: HexColor,
  negative: HexColor,
});
export type ThemeColors = z.infer<typeof ThemeColors>;

export const ThemeFonts = z.object({
  /** Headlines. */
  display: z.string().min(1),
  /** Body prose. */
  body: z.string().min(1),
  /** Labels, eyebrows, numbers, anything that should read as technical. */
  mono: z.string().min(1),
  /**
   * What PowerPoint uses instead.
   *
   * A .pptx does not carry fonts. Naming a face the recipient does not have
   * means PowerPoint silently substitutes one and the layout moves, so the
   * export deliberately falls back to faces that ship with Office.
   */
  pptxDisplay: z.string().min(1),
  pptxBody: z.string().min(1),
  /** Google Fonts family names to load in the browser and the PDF renderer. */
  webFontFamilies: z.array(z.string()).default([]),
});
export type ThemeFonts = z.infer<typeof ThemeFonts>;

/** Type sizes in slide pixels. Divide by two for points. */
export const ThemeType = z.object({
  /** Cover headline. */
  hero: z.number().positive(),
  /** Slide titles. */
  title: z.number().positive(),
  /** Section numerals and big statements. */
  display: z.number().positive(),
  /** Lead paragraph under a title. */
  lead: z.number().positive(),
  /** Body copy. */
  body: z.number().positive(),
  /** Captions, sources, footers. */
  small: z.number().positive(),
  /** Uppercase eyebrows and labels. */
  label: z.number().positive(),
  /** Stat values. */
  stat: z.number().positive(),
  /** Multiplier applied to font size for line height. */
  lineHeight: z.number().positive().default(1.3),
  /** Letter spacing for labels, in em. */
  labelTracking: z.number().default(0.08),
  /** Whether labels render uppercase. */
  labelUppercase: z.boolean().default(true),
});
export type ThemeType = z.infer<typeof ThemeType>;

export const Theme = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Drives the presenter chrome and the editor preview background. */
  mode: z.enum(['dark', 'light']),
  colors: ThemeColors,
  fonts: ThemeFonts,
  type: ThemeType,
  /** Outer slide padding in slide pixels. */
  pad: z.number().positive().default(112),
  /** Base spacing unit. */
  space: z.number().positive().default(24),
  radius: z.object({ sm: z.number(), md: z.number(), lg: z.number() }),
  /**
   * The short accent hairline drawn at the leading edge of list rows and
   * dividers. A CubCloud signature; other themes can turn it off.
   */
  hairline: z.boolean().default(true),
  /** A soft shadow under light text on dark grounds. Ignored in PowerPoint. */
  textShadow: z.boolean().default(false),
});
export type Theme = z.infer<typeof Theme>;
