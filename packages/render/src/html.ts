import { visibleSlides, type Deck } from '@cubpitch/core';
import { fontHref, getTheme, slideCss } from '@cubpitch/theme';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeckView } from './Deck.js';
import { SlideView } from './Slide.js';

/**
 * Deck to standalone HTML.
 *
 * This document is the single source the PDF exporter prints and the presenter
 * displays. It carries no JavaScript and no bundler output: what Chromium
 * receives is exactly what a browser would render, which is the only reason the
 * PDF and the on-screen deck can be trusted to match.
 */

export interface HtmlOptions {
  /** Emit the Google Fonts link. Off for offline or air-gapped rendering. */
  webFonts?: boolean;
  /** Extra CSS appended after the theme sheet. */
  extraCss?: string;
  /** Document title. Defaults to the deck title. */
  title?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);
}

export function renderDeckHtml(deck: Deck, options: HtmlOptions = {}): string {
  const theme = getTheme(deck.themeId);
  const body = renderToStaticMarkup(DeckView({ deck }));
  const href = options.webFonts === false ? null : fontHref(theme);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title ?? deck.title)}</title>
${href ? `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${href}">` : ''}
<style>
html, body { margin: 0; padding: 0; background: ${theme.colors.bg}; }
${slideCss(theme)}
${options.extraCss ?? ''}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

/** One slide as a standalone document, for thumbnails and single-slide export. */
export function renderSlideHtml(deck: Deck, slideId: string, options: HtmlOptions = {}): string {
  const theme = getTheme(deck.themeId);
  const slides = visibleSlides(deck);
  const index = slides.findIndex((slide) => slide.id === slideId);
  const slide = slides[index];
  if (!slide) throw new Error(`Slide ${slideId} is not in deck ${deck.id}`);

  const body = renderToStaticMarkup(
    SlideView({ slide, ctx: { deck, theme, number: index + 1, total: slides.length } }),
  );
  const href = options.webFonts === false ? null : fontHref(theme);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(options.title ?? deck.title)}</title>
${href ? `<link rel="stylesheet" href="${href}">` : ''}
<style>
html, body { margin: 0; padding: 0; background: ${theme.colors.bg}; }
${slideCss(theme)}
${options.extraCss ?? ''}
</style></head><body>${body}</body></html>`;
}
