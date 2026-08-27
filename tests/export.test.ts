import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { deckToPptx } from '@cubpitch/export';
import { emptySlide, type Slide } from '@cubpitch/core';
import { sampleDeck } from './fixtures/deck.js';

/**
 * PowerPoint export is verified by opening the archive and reading the XML,
 * not by checking that a Buffer came back non-empty. A .pptx that opens to
 * twelve blank slides is a passing test and a lost meeting.
 */

function openPptx(buffer: Buffer): Record<string, string> {
  const files = unzipSync(new Uint8Array(buffer));
  const out: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) {
    if (name.endsWith('.xml') || name.endsWith('.rels')) out[name] = strFromU8(bytes);
  }
  return out;
}

/**
 * Every entry in the archive, not just the readable ones.
 *
 * `openPptx` decodes XML, which is what most assertions want. Package integrity
 * needs the whole list: charts reference an embedded .xlsx workbook, and a
 * relationship check run against the XML-only list reports it missing when it
 * is right there.
 */
function pptxEntries(buffer: Buffer): string[] {
  return Object.keys(unzipSync(new Uint8Array(buffer)));
}

function slideXml(files: Record<string, string>): string[] {
  return Object.entries(files)
    .filter(([name]) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort(([a], [b]) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))
    .map(([, xml]) => xml);
}

describe('PowerPoint export', () => {
  it('produces one slide per visible deck slide', async () => {
    const deck = sampleDeck();
    const files = openPptx(await deckToPptx(deck));
    expect(slideXml(files)).toHaveLength(deck.slides.length);
  });

  it('writes real text, not pictures of text', async () => {
    // The whole reason to emit .pptx rather than a PDF is that a partner can
    // edit it. Text has to arrive as text.
    const xml = slideXml(openPptx(await deckToPptx(sampleDeck()))).join('\n');
    expect(xml).toContain('Hospitals pay $40K a month');
    expect(xml).toContain('Bozeman Health');
    expect(xml).toContain('<a:t>');
  });

  it('keeps chart data editable rather than flattening it', async () => {
    // A chart exported as an image cannot be corrected the week before the
    // meeting, which is exactly when the numbers change.
    const files = openPptx(await deckToPptx(sampleDeck()));
    const charts = Object.keys(files).filter((name) => name.startsWith('ppt/charts/'));
    expect(charts.length).toBeGreaterThan(0);
    const chartXml = charts.map((name) => files[name]!).join('\n');
    expect(chartXml).toContain('31000');
  });

  it('carries speaker notes into the notes pane', async () => {
    const files = openPptx(await deckToPptx(sampleDeck()));
    const notes = Object.entries(files)
      .filter(([name]) => name.startsWith('ppt/notesSlides/'))
      .map(([, xml]) => xml)
      .join('\n');
    expect(notes).toContain('Leave this slide up');
  });

  it('uses fonts the recipient actually has', async () => {
    // Naming Bebas Neue to a partner who lacks it means PowerPoint substitutes
    // silently and every layout shifts.
    const xml = slideXml(openPptx(await deckToPptx(sampleDeck()))).join('\n');
    expect(xml).toContain('Arial');
    expect(xml).not.toContain('Bebas');
  });

  it('honours the Kawasaki thirty-point floor', async () => {
    // 10/20/30's third number is the one that does the work: it forces the
    // author to cut until only the argument is left.
    const deck = { ...sampleDeck(), methodologyId: 'kawasaki' };
    const xml = slideXml(openPptx(await deckToPptx(deck))).join('\n');
    const sizes = [...xml.matchAll(/sz="(\d+)"/g)].map((match) => Number(match[1]) / 100);
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(30);

    // The house methodology sets no floor, so small type is allowed there.
    const houseXml = slideXml(openPptx(await deckToPptx(sampleDeck()))).join('\n');
    const houseSizes = [...houseXml.matchAll(/sz="(\d+)"/g)].map((match) => Number(match[1]) / 100);
    expect(Math.min(...houseSizes)).toBeLessThan(30);
  });

  it('renders every slide type without throwing', async () => {
    const types: Slide['type'][] = [
      'cover', 'problem', 'solution', 'whyNow', 'market', 'product', 'traction',
      'businessModel', 'goToMarket', 'competition', 'team', 'ask', 'agenda',
      'section', 'statement', 'howItWorks', 'metrics', 'moat', 'roadmap',
      'financials', 'useOfFunds', 'logos', 'quote', 'closing', 'bullets', 'image',
    ];
    const deck = { ...sampleDeck(), slides: types.map((type) => emptySlide(type)) };
    const files = openPptx(await deckToPptx(deck));
    expect(slideXml(files)).toHaveLength(types.length);
  });

  it('omits hidden slides', async () => {
    const deck = sampleDeck();
    const hidden = { ...deck, slides: deck.slides.map((slide, index) => (index === 3 ? { ...slide, hidden: true } : slide)) };
    const xml = slideXml(openPptx(await deckToPptx(hidden))).join('\n');
    expect(xml).not.toContain('Inference got cheap enough');
  });

  it('sets a 16:9 slide size matching the web canvas', async () => {
    const files = openPptx(await deckToPptx(sampleDeck()));
    const presentation = files['ppt/presentation.xml']!;
    const match = presentation.match(/sldSz[^/]*cx="(\d+)"\s+cy="(\d+)"/);
    expect(match).toBeTruthy();
    const [, cx, cy] = match!;
    // EMU: 914400 per inch. 13.333in x 7.5in.
    expect(Number(cx) / 914400).toBeCloseTo(13.333, 2);
    expect(Number(cy) / 914400).toBeCloseTo(7.5, 2);
  });
});

describe('PowerPoint content loss', () => {
  it('draws a positioning chart instead of dropping the slide', async () => {
    // The web renderer and the PDF both draw the quadrant. PowerPoint used to
    // skip it, which is the worst kind of export bug: the file opens fine and
    // the slide is empty.
    const deck = sampleDeck();
    const competition = deck.slides.find((slide) => slide.type === 'competition')!;
    const withQuadrant = {
      ...deck,
      slides: deck.slides.map((slide) =>
        slide.id === competition.id
          ? {
              ...slide,
              matrix: undefined,
              quadrant: {
                xAxis: ['Off-premise', 'On-premise'] as [string, string],
                yAxis: ['No audit trail', 'Audit trail'] as [string, string],
                points: [
                  { label: 'CubCloud', x: 0.82, y: 0.86, us: true },
                  { label: 'Gov cloud', x: 0.3, y: 0.55, us: false },
                ],
              },
            }
          : slide,
      ),
    };

    const xml = slideXml(openPptx(await deckToPptx(withQuadrant as typeof deck))).join('\n');
    expect(xml).toContain('CubCloud');
    expect(xml).toContain('Gov cloud');
    expect(xml).toContain('On-premise');
  });
});

describe('PowerPoint package integrity', () => {
  /**
   * PowerPoint refuses a file whose parts and relationships disagree, and it
   * refuses it with "needs repair" rather than anything diagnostic. Reading the
   * package structure here is the closest thing to opening it that a test can
   * do without PowerPoint.
   */
  it('declares every part it ships and ships every part it references', async () => {
    const buffer = await deckToPptx(sampleDeck());
    const files = openPptx(buffer);
    const names = pptxEntries(buffer);

    const contentTypes = files['[Content_Types].xml'];
    expect(contentTypes, 'a package with no [Content_Types].xml will not open').toBeDefined();

    const slides = names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slides.length).toBeGreaterThan(0);

    for (const slide of slides) {
      // Every slide part must be declared, or PowerPoint reports the file as
      // corrupt rather than skipping the slide.
      expect(contentTypes, `${slide} is not declared in [Content_Types].xml`).toContain(`/${slide}`);

      // Every slide needs its relationship part, which is what carries its
      // layout, charts and notes.
      const rels = slide.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
      expect(names, `${slide} has no relationships part`).toContain(rels);
    }

    // Every relationship target must resolve to a part that is actually in the
    // archive. A dangling target is the usual cause of "needs repair".
    for (const [name, xml] of Object.entries(files)) {
      if (!name.endsWith('.rels')) continue;
      const dir = name.replace(/_rels\/[^/]+$/, '');
      for (const match of xml.matchAll(/Target="([^"]+)"[^>]*?(TargetMode="External")?\s*\/>/g)) {
        const target = match[1]!;
        if (match[2] || target.startsWith('http') || target.startsWith('../slideMasters')) continue;
        const resolved = new URL(target, `file:///${dir}`).pathname.replace(/^\//, '');
        if (!resolved.includes('..')) {
          expect(names, `${name} points at ${resolved}, which is not in the package`).toContain(resolved);
        }
      }
    }
  });

  it('references every slide from the presentation', async () => {
    const files = openPptx(await deckToPptx(sampleDeck()));
    const presentationRels = files['ppt/_rels/presentation.xml.rels']!;
    const slideCount = Object.keys(files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).length;
    const referenced = [...presentationRels.matchAll(/slides\/slide\d+\.xml/g)].length;
    expect(referenced).toBe(slideCount);
  });
});
