import type { Deck } from '@cubpitch/core';
import { renderDeckHtml, renderSlideHtml } from '@cubpitch/render';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@cubpitch/theme';
import { launchBrowser, type BrowserOptions } from './browser.js';

/**
 * PDF export.
 *
 * The PDF is the web deck, printed. Chromium renders the same HTML the browser
 * and the presenter show, which is the only arrangement where "it looked right
 * on screen" is evidence about the file the investor opens.
 *
 * Page size comes from the stylesheet's `@page` rule via `preferCSSPageSize`
 * rather than from width and height passed here, so there is exactly one place
 * that decides how big a slide is.
 */

export interface PdfOptions extends BrowserOptions {
  /** Load Google Fonts. Off renders with fallback faces and no network. */
  webFonts?: boolean;
  /** Milliseconds to wait for fonts and images. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 30_000;

async function withPage<T>(
  html: string,
  options: PdfOptions,
  action: (page: import('playwright').Page) => Promise<T>,
): Promise<T> {
  const browser = await launchBrowser(options);
  try {
    const page = await browser.newPage({ viewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT } });
    const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT;
    await page.setContent(html, { waitUntil: 'load', timeout });

    // Without this the first page can print in a fallback face while the rest
    // print in the real one, which looks like a bug in the deck.
    await page.evaluate(() => document.fonts.ready).catch(() => undefined);

    return await action(page);
  } finally {
    await browser.close();
  }
}

export async function deckToPdf(deck: Deck, options: PdfOptions = {}): Promise<Buffer> {
  const html = renderDeckHtml(deck, { webFonts: options.webFonts !== false });
  return withPage(html, options, async (page) =>
    page.pdf({ printBackground: true, preferCSSPageSize: true, scale: 1 }),
  );
}

/** One slide as a PNG, for thumbnails and the editor rail. */
export async function slideToPng(
  deck: Deck,
  slideId: string,
  options: PdfOptions & { width?: number } = {},
): Promise<Buffer> {
  const html = renderSlideHtml(deck, slideId, { webFonts: options.webFonts !== false });
  const scale = (options.width ?? SLIDE_WIDTH) / SLIDE_WIDTH;

  const browser = await launchBrowser(options);
  try {
    const page = await browser.newPage({
      viewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      deviceScaleFactor: scale,
    });
    await page.setContent(html, { waitUntil: 'load', timeout: options.timeoutMs ?? DEFAULT_TIMEOUT });
    await page.evaluate(() => document.fonts.ready).catch(() => undefined);
    const element = await page.$('.cp-slide');
    if (!element) throw new Error('Rendered slide produced no artboard');
    return await element.screenshot({ type: 'png' });
  } finally {
    await browser.close();
  }
}
