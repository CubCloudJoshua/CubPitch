import { describe, expect, it } from 'vitest';
import { emptySlide, visibleSlides, type Slide } from '@cubpitch/core';
import { renderDeckHtml, renderSlideHtml } from '@cubpitch/render';
import { getTheme, THEMES } from '@cubpitch/theme';
import { sampleDeck } from './fixtures/deck.js';

describe('deck rendering', () => {
  it('renders one artboard per visible slide', () => {
    const deck = sampleDeck();
    const html = renderDeckHtml(deck);
    const artboards = html.match(/class="cp-slide"/g) ?? [];
    expect(artboards).toHaveLength(visibleSlides(deck).length);
  });

  it('leaves hidden slides out of the render entirely', () => {
    // A hidden slide that still prints is a confidential appendix in an
    // investor's inbox.
    const deck = sampleDeck();
    const hidden = { ...deck, slides: deck.slides.map((slide, index) => (index === 3 ? { ...slide, hidden: true } : slide)) };
    const html = renderDeckHtml(hidden);
    expect(html).not.toContain('Inference got cheap enough');
    expect(html.match(/class="cp-slide"/g) ?? []).toHaveLength(deck.slides.length - 1);
  });

  it('renders every slide type without throwing', () => {
    // The dispatcher is exhaustive at the type level; this proves it at runtime.
    const types: Slide['type'][] = [
      'cover', 'problem', 'solution', 'whyNow', 'market', 'product', 'traction',
      'businessModel', 'goToMarket', 'competition', 'team', 'ask', 'agenda',
      'section', 'statement', 'howItWorks', 'metrics', 'moat', 'roadmap',
      'financials', 'useOfFunds', 'logos', 'quote', 'closing', 'bullets', 'image',
    ];
    const deck = { ...sampleDeck(), slides: types.map((type) => emptySlide(type)) };
    const html = renderDeckHtml(deck);
    expect(html.match(/class="cp-slide"/g) ?? []).toHaveLength(types.length);
    for (const type of types) expect(html).toContain(`data-slide-type="${type}"`);
  });

  it('escapes content rather than injecting it', () => {
    // Deck text is author input and lands in an HTML document.
    const deck = sampleDeck();
    const evil = {
      ...deck,
      slides: [{ ...deck.slides[0]!, headline: '<script>alert(1)</script>' } as Slide],
    };
    const html = renderDeckHtml(evil);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders bold and italic markup as elements, not asterisks', () => {
    const deck = sampleDeck();
    const slide = { ...deck.slides[0]!, oneLiner: 'We help **regulated** operators.' } as Slide;
    const html = renderDeckHtml({ ...deck, slides: [slide] });
    expect(html).toContain('<strong>regulated</strong>');
    expect(html).not.toContain('**regulated**');
  });

  it('applies the deck theme to the document', () => {
    for (const theme of THEMES) {
      const html = renderDeckHtml({ ...sampleDeck(), themeId: theme.id });
      expect(html).toContain(`--cp-accent: ${theme.colors.accent}`);
      expect(html).toContain(theme.colors.bg);
    }
  });

  it('sets the print page to exactly one slide', () => {
    // If this drifts, every exported PDF gets a second blank page per slide.
    const html = renderDeckHtml(sampleDeck());
    expect(html).toContain('@page { size: 13.333333333333334in 7.5in; margin: 0; }');
  });

  it('renders a single slide standalone for thumbnails', () => {
    const deck = sampleDeck();
    const html = renderSlideHtml(deck, 's7');
    expect(html.match(/class="cp-slide"/g) ?? []).toHaveLength(1);
    expect(html).toContain('Two systems paying');
  });

  it('orders traction evidence by strength, not by authoring order', () => {
    // The framework ranks revenue over an LOI. The slide should too, even if
    // the author typed the LOI first.
    const deck = sampleDeck();
    const html = renderSlideHtml(deck, 's7');
    expect(html.indexOf('$31K MRR')).toBeLessThan(html.indexOf('Signed letters of intent'));
  });

  it('can render without reaching the network', () => {
    // Air-gapped and CI rendering must not depend on Google Fonts resolving.
    const html = renderDeckHtml(sampleDeck(), { webFonts: false });
    expect(html).not.toContain('fonts.googleapis.com');
    expect(getTheme('cubcloud').fonts.display).toContain('sans-serif');
  });
});
