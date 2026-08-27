import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deckToPdf, deckToPptx, slideToPng } from '@cubpitch/export';
import { sampleDeck } from './fixtures/deck.js';

/**
 * The end-to-end export check. Slow (it starts a browser), so it is opt-in via
 * CUBPITCH_E2E=1 and runs in CI rather than on every save.
 *
 * It writes real files to .artifacts/ so a human can open them, which is the
 * only way to catch "valid PDF, wrong layout".
 */
const e2e = process.env.CUBPITCH_E2E === '1' ? describe : describe.skip;

e2e('end-to-end export', () => {
  const outDir = new URL('../.artifacts/', import.meta.url).pathname;

  it('renders a real PDF at exactly one page per slide', { timeout: 120_000 }, async () => {
    const deck = sampleDeck();
    const pdf = await deckToPdf(deck, { webFonts: false });
    mkdirSync(outDir, { recursive: true });
    writeFileSync(`${outDir}/cubcloud-seed.pdf`, pdf);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    // Count page objects: a blank page per slide is the classic print-CSS bug.
    const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pageCount).toBe(deck.slides.length);
  });

  it('renders a slide thumbnail', { timeout: 120_000 }, async () => {
    const png = await slideToPng(sampleDeck(), 's7', { width: 640, webFonts: false });
    writeFileSync(`${outDir}/slide-traction.png`, png);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
  });

  it('writes a PowerPoint file that opens', { timeout: 120_000 }, async () => {
    const pptx = await deckToPptx(sampleDeck());
    writeFileSync(`${outDir}/cubcloud-seed.pptx`, pptx);
    // PK zip magic.
    expect(pptx.subarray(0, 2).toString()).toBe('PK');
  });
});

e2e('overflow detection', () => {
  it('names the slides whose content does not fit', { timeout: 120_000 }, async () => {
    const { findOverflow } = await import('@cubpitch/export');
    const deck = sampleDeck();

    // A slide nobody could fit on a canvas.
    const stuffed = {
      ...deck,
      slides: deck.slides.map((slide) =>
        slide.id === 's2' && slide.type === 'problem'
          ? { ...slide, who: 'A very long sentence. '.repeat(60), today: 'More. '.repeat(80) }
          : slide,
      ),
    };

    const findings = await findOverflow(stuffed, { webFonts: false });
    expect(findings.map((finding) => finding.slideId)).toContain('s2');
    expect(findings.find((finding) => finding.slideId === 's2')!.overflowPx).toBeGreaterThan(2);
  });

  it('reports nothing for a deck that fits', { timeout: 120_000 }, async () => {
    const { findOverflow } = await import('@cubpitch/export');
    const findings = await findOverflow(sampleDeck(), { webFonts: false });
    expect(findings.map((f) => `${f.number}. ${f.title} (+${f.overflowPx}px)`)).toEqual([]);
  });
});
