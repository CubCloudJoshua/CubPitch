import { visibleSlides, slideTitle, type Deck } from '@cubpitch/core';
import { renderDeckHtml } from '@cubpitch/render';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@cubpitch/theme';
import { launchBrowser, type BrowserOptions } from './browser.js';

/**
 * Overflow detection.
 *
 * The stylesheet clips content that does not fit rather than letting it run
 * under the slide number, which keeps a crowded slide from looking like a
 * broken renderer. But clipping quietly is its own failure: an author who
 * cannot see that a line was dropped will present the slide anyway.
 *
 * So the layout is measured in the same engine that prints it, and the slides
 * that overflow are named. This is the check that a word count cannot make,
 * because whether text fits depends on the font, the wrapping, and the box.
 */

export interface OverflowFinding {
  slideId: string;
  title: string;
  /** 1-based position among visible slides. */
  number: number;
  /** How many pixels of content did not fit. */
  overflowPx: number;
}

export interface OverflowOptions extends BrowserOptions {
  webFonts?: boolean;
  timeoutMs?: number;
  /** Overflow under this many pixels is sub-pixel rounding, not a problem. */
  tolerancePx?: number;
}

export async function findOverflow(deck: Deck, options: OverflowOptions = {}): Promise<OverflowFinding[]> {
  const slides = visibleSlides(deck);
  if (slides.length === 0) return [];

  const html = renderDeckHtml(deck, { webFonts: options.webFonts !== false });
  const tolerance = options.tolerancePx ?? 2;

  const browser = await launchBrowser(options);
  try {
    const page = await browser.newPage({ viewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT } });
    await page.setContent(html, { waitUntil: 'load', timeout: options.timeoutMs ?? 30_000 });
    await page.evaluate(() => document.fonts.ready).catch(() => undefined);

    const measured = await page.evaluate(() => {
      const out: Array<{ slideId: string; overflowPx: number }> = [];
      for (const artboard of document.querySelectorAll('.cp-slide')) {
        const slideId = artboard.getAttribute('data-slide-id') ?? '';
        let worst = 0;
        // Measure the content region where clipping applies, and the artboard
        // itself for slide types that lay out without one.
        const regions = [...artboard.querySelectorAll('.cp-content'), artboard];
        for (const region of regions) {
          worst = Math.max(worst, region.scrollHeight - region.clientHeight, region.scrollWidth - region.clientWidth);
        }
        out.push({ slideId, overflowPx: worst });
      }
      return out;
    });

    return measured
      .map((entry, index) => {
        const slide = slides[index];
        return {
          slideId: entry.slideId || slide?.id || '',
          title: slide ? slideTitle(slide) : '',
          number: index + 1,
          overflowPx: Math.round(entry.overflowPx),
        };
      })
      .filter((finding) => finding.overflowPx > tolerance);
  } finally {
    await browser.close();
  }
}
