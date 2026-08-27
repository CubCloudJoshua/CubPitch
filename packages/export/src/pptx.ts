import {
  EVIDENCE_LABELS,
  evidenceStrength,
  getMethodology,
  MOTION_LABELS,
  plainText,
  visibleSlides,
  type ChartSpec,
  type Deck,
  type Slide,
} from '@cubpitch/core';
import { getTheme, pxToInches, SLIDE_HEIGHT, SLIDE_WIDTH, type Theme } from '@cubpitch/theme';
import {
  createPresentation,
  type PptxChartOptions,
  type PptxChartSeries,
  type PptxChartType,
  type PptxPresentation,
  type PptxSlide,
  type PptxTableCell,
  type PptxTextOptions,
} from './pptx-api.js';
import { hex, inches, labelText, scaleStyle, SlideLayout, textRuns, typeScale, type Box, type TypeStyle } from './pptx-layout.js';

/**
 * PowerPoint export.
 *
 * Native shapes, not pictures. A deck exported as twelve screenshots is a PDF
 * with a .pptx extension: the partner who wants to change one number cannot,
 * and the associate who wants to lift a slide into an investment memo cannot
 * either. Everything here is a real text box, a real table, or a real chart
 * with its data still attached.
 *
 * The layout reproduces the CSS rhythm rather than the CSS itself. PowerPoint
 * has absolute boxes and no flexbox, so matching pixel-for-pixel would mean
 * writing a layout engine; matching the padding, type scale, colour and accent
 * treatment gets a deck that reads as the same deck and stays editable.
 */

export interface PptxOptions {
  /** Deck author, written to the file's document properties. */
  author?: string;
  /** Compress the archive. Roughly 30% smaller, slightly slower. */
  compression?: boolean;
}

const LAYOUT_NAME = 'CUBPITCH_16x9';

export async function deckToPptx(deck: Deck, options: PptxOptions = {}): Promise<Buffer> {
  const theme = getTheme(deck.themeId);
  const methodology = getMethodology(deck.methodologyId);
  const type = typeScale(theme, methodology.minFontPt);

  const pptx = createPresentation();
  pptx.defineLayout({ name: LAYOUT_NAME, width: pxToInches(SLIDE_WIDTH), height: pxToInches(SLIDE_HEIGHT) });
  pptx.layout = LAYOUT_NAME;
  pptx.title = deck.title;
  pptx.subject = deck.company.tagline || deck.title;
  pptx.company = deck.company.name;
  pptx.author = options.author ?? deck.company.name;

  const slides = visibleSlides(deck);
  slides.forEach((slide, index) => {
    const target = pptx.addSlide();
    target.background = { color: hex(theme.colors.bg) };
    const ctx: Ctx = {
      deck,
      theme,
      type,
      scale: (style, factor) => scaleStyle(style, factor, methodology.minFontPt),
      pptx,
      slide: target,
      number: index + 1,
      total: slides.length,
    };
    drawSlide(ctx, slide);
    if (slide.notes) target.addNotes(slide.notes);
  });

  return pptx.write({ outputType: 'nodebuffer', compression: options.compression ?? true });
}

interface Ctx {
  deck: Deck;
  theme: Theme;
  type: Record<string, TypeStyle>;
  /** Derive a size while keeping the methodology's minimum font size. */
  scale: (style: TypeStyle, factor: number) => TypeStyle;
  pptx: PptxPresentation;
  slide: PptxSlide;
  number: number;
  total: number;
}

// --- Drawing helpers --------------------------------------------------------

function text(ctx: Ctx, value: string, box: Box, style: TypeStyle, extra: PptxTextOptions = {}): void {
  if (!value) return;
  ctx.slide.addText(textRuns(value, { ...style, ...extra }), {
    ...inches(box),
    valign: 'top',
    isTextBox: true,
    margin: 0,
    wrap: true,
    ...style,
    ...extra,
  });
}

function label(ctx: Ctx, value: string, box: Box, extra: PptxTextOptions = {}): void {
  if (!value) return;
  text(ctx, labelText(ctx.theme, value), box, ctx.type.label!, extra);
}

/** A surface panel: the PowerPoint equivalent of `.cp-surface`. */
function panel(ctx: Ctx, box: Box, accent = false): void {
  ctx.slide.addShape('roundRect', {
    ...inches(box),
    fill: { color: hex(ctx.theme.colors.surface) },
    line: { color: hex(accent ? ctx.theme.colors.accent : ctx.theme.colors.border), width: 1 },
    rectRadius: pxToInches(ctx.theme.radius.md),
  });
}

/** The leading accent hairline that marks a row in the CSS. */
function hairline(ctx: Ctx, box: Box, width = 48): void {
  ctx.slide.addShape('rect', {
    ...inches({ x: box.x, y: box.y, w: width, h: 3 }),
    fill: { color: hex(ctx.theme.colors.accent) },
    line: { color: hex(ctx.theme.colors.accent), width: 0 },
  });
}

function divider(ctx: Ctx, box: Box): void {
  ctx.slide.addShape('rect', {
    ...inches({ x: box.x, y: box.y, w: box.w, h: 1 }),
    fill: { color: hex(ctx.theme.colors.border) },
    line: { color: hex(ctx.theme.colors.border), width: 0 },
  });
}

/** Title block. Returns the y where content may start. */
function header(ctx: Ctx, layout: SlideLayout, eyebrow: string | undefined, title: string, lead?: string): void {
  if (eyebrow) {
    label(ctx, eyebrow, layout.take(30, 14));
  }
  const titleHeight = title.length > 46 ? 190 : 110;
  text(ctx, title, layout.take(titleHeight, lead ? 16 : 40), ctx.type.title!, { lineSpacingMultiple: 0.92 });
  if (lead) {
    text(ctx, lead, layout.take(80, 40), ctx.type.lead!);
  }
}

function footer(ctx: Ctx): void {
  const { deck, theme } = ctx;
  const left = deck.meta.footer || deck.meta.confidentiality;
  const right = deck.meta.showSlideNumbers ? `${ctx.number} / ${ctx.total}` : '';
  const y = SLIDE_HEIGHT - theme.pad + 24;

  divider(ctx, { x: theme.pad, y: y - 22, w: SLIDE_WIDTH - theme.pad * 2, h: 1 });
  if (left) text(ctx, left, { x: theme.pad, y, w: 900, h: 40 }, ctx.type.small!);
  if (right) {
    text(ctx, right, { x: SLIDE_WIDTH - theme.pad - 400, y, w: 400, h: 40 }, ctx.type.small!, { align: 'right' });
  }
}

/** Label over value, the stat tile used across half the deck. */
function stat(ctx: Ctx, box: Box, value: string, labelText_: string, note?: string): void {
  text(ctx, value, { ...box, h: 120 }, ctx.type.stat!, { lineSpacingMultiple: 1 });
  label(ctx, labelText_, { x: box.x, y: box.y + 124, w: box.w, h: 40 });
  if (note) text(ctx, note, { x: box.x, y: box.y + 168, w: box.w, h: 60 }, ctx.type.small!);
}

/** Rows with the accent hairline, matching `.cp-row`. */
function rows(
  ctx: Ctx,
  box: Box,
  items: Array<{ label?: string; body: string; right?: string }>,
  rowHeight = 130,
): void {
  items.forEach((item, index) => {
    const y = box.y + rowHeight * index;
    divider(ctx, { x: box.x, y, w: box.w, h: 1 });
    if (ctx.theme.hairline) hairline(ctx, { x: box.x, y, w: box.w, h: 3 });

    const textWidth = item.right ? box.w - 420 : box.w;
    let cursor = y + 22;
    if (item.label) {
      label(ctx, item.label, { x: box.x, y: cursor, w: textWidth, h: 32 });
      cursor += 40;
    }
    text(ctx, item.body, { x: box.x, y: cursor, w: textWidth, h: rowHeight - (cursor - y) - 12 }, ctx.type.body!);
    if (item.right) {
      text(
        ctx,
        item.right,
        { x: box.x + box.w - 400, y: y + 26, w: 400, h: 80 },
        ctx.scale(ctx.type.stat!, 0.55),
        { align: 'right' },
      );
    }
  });
}

// --- Charts -----------------------------------------------------------------

const CHART_TYPE: Record<ChartSpec['kind'], PptxChartType> = {
  bar: 'bar',
  stackedBar: 'bar',
  line: 'line',
  area: 'area',
  donut: 'doughnut',
};

/**
 * Native PowerPoint charts, so the numbers stay editable.
 *
 * The alternative is rasterising the SVG the web renderer draws, which produces
 * a chart nobody can correct when a figure changes the week before the meeting.
 */
function chart(ctx: Ctx, spec: ChartSpec, box: Box): void {
  const data: PptxChartSeries[] = spec.series.map((series) => ({
    name: series.name,
    labels: series.points.map((point) => point.label),
    values: series.points.map((point) => point.value),
  }));

  const options: PptxChartOptions = {
    ...inches(box),
    chartColors: ctx.theme.colors.chart.map(hex),
    showLegend: spec.showLegend && spec.series.length > 1,
    legendPos: 'b',
    legendColor: hex(ctx.theme.colors.inkMuted),
    legendFontSize: 12,
    showValue: spec.showValues,
    dataLabelColor: hex(ctx.theme.colors.ink),
    dataLabelFontSize: 11,
    catAxisLabelColor: hex(ctx.theme.colors.inkMuted),
    catAxisLabelFontSize: 12,
    valAxisLabelColor: hex(ctx.theme.colors.inkMuted),
    valAxisLabelFontSize: 12,
    valGridLine: { color: hex(ctx.theme.colors.border), style: 'solid', size: 1 },
    catGridLine: { style: 'none' },
    // The slide is dark; a chart with the default white plot area is a hole in it.
    chartArea: { fill: { color: hex(ctx.theme.colors.bg) } },
    plotArea: { fill: { color: hex(ctx.theme.colors.bg) } },
  };

  if (spec.kind === 'bar' || spec.kind === 'stackedBar') {
    options.barDir = 'col';
    options.barGrouping = spec.kind === 'stackedBar' ? 'stacked' : 'clustered';
  }
  if (spec.kind === 'line' || spec.kind === 'area') {
    options.lineSmooth = false;
    options.lineSize = 3;
  }
  if (spec.kind === 'donut') options.holeSize = 62;

  ctx.slide.addChart(CHART_TYPE[spec.kind], data, options);

  if (spec.source) {
    text(ctx, `Source: ${spec.source}`, { x: box.x, y: box.y + box.h + 8, w: box.w, h: 40 }, ctx.type.small!);
  }
}

// --- Per-slide drawing ------------------------------------------------------

function drawSlide(ctx: Ctx, slide: Slide): void {
  const layout = new SlideLayout(ctx.theme, SLIDE_WIDTH, SLIDE_HEIGHT);
  const chromeless = slide.type === 'cover' || slide.type === 'closing' || slide.type === 'section' || slide.type === 'statement' || slide.type === 'image';

  switch (slide.type) {
    case 'cover': {
      const y = 380;
      text(ctx, slide.headline, { x: layout.pad, y, w: layout.contentWidth, h: 200 }, ctx.type.hero!, { lineSpacingMultiple: 0.9 });
      if (slide.oneLiner) {
        text(ctx, slide.oneLiner, { x: layout.pad, y: y + 210, w: 1180, h: 160 }, { ...ctx.type.lead!, color: hex(ctx.theme.colors.ink) });
      }
      ctx.slide.addShape('rect', {
        ...inches({ x: layout.pad, y: y + 400, w: 120, h: 4 }),
        fill: { color: hex(ctx.theme.colors.accent) },
        line: { color: hex(ctx.theme.colors.accent), width: 0 },
      });
      const meta = [slide.presenter, slide.date, slide.confidential ? ctx.deck.meta.confidentiality : '']
        .filter(Boolean)
        .join('     ');
      if (meta) label(ctx, meta, { x: layout.pad, y: SLIDE_HEIGHT - layout.pad - 20, w: layout.contentWidth, h: 40 });
      break;
    }

    case 'problem': {
      header(ctx, layout, 'Problem', slide.title);
      const box = layout.take(560);
      const [left, right] = layout.columns(box, slide.stat ? 2 : 1, 64);
      const entries = (
        [
          ['Who hurts', slide.who],
          ['What they do today', slide.today],
          ['What it costs them', slide.cost],
          ['Why it is getting worse', slide.worsening],
        ] as const
      )
        .filter(([, value]) => value)
        .map(([labelValue, value]) => ({ label: labelValue, body: value }));
      rows(ctx, left!, entries, 140);
      if (slide.stat && right) {
        panel(ctx, { ...right, h: 320 });
        stat(ctx, { x: right.x + 48, y: right.y + 70, w: right.w - 96, h: 200 }, slide.stat.value, slide.stat.label, slide.stat.note);
      }
      break;
    }

    case 'solution': {
      header(ctx, layout, 'Solution', slide.title, slide.lead);
      if (slide.before || slide.after) {
        const box = layout.take(260, 40);
        const [before, after] = layout.columns(box, 2, 48);
        panel(ctx, before!);
        label(ctx, 'Before', { x: before!.x + 36, y: before!.y + 32, w: before!.w - 72, h: 34 });
        text(ctx, slide.before, { x: before!.x + 36, y: before!.y + 78, w: before!.w - 72, h: 150 }, ctx.type.body!, {
          color: hex(ctx.theme.colors.inkMuted),
        });
        panel(ctx, after!, true);
        label(ctx, 'After', { x: after!.x + 36, y: after!.y + 32, w: after!.w - 72, h: 34 }, { color: hex(ctx.theme.colors.accentBright) });
        text(ctx, slide.after, { x: after!.x + 36, y: after!.y + 78, w: after!.w - 72, h: 150 }, ctx.type.body!);
      }
      if (slide.inScope.length > 0 || slide.outOfScope.length > 0) {
        const box = layout.take(240);
        const [inBox, outBox] = layout.columns(box, 2, 48);
        scopeList(ctx, inBox!, 'In scope', slide.inScope, ctx.theme.colors.ink);
        scopeList(ctx, outBox!, 'Out of scope', slide.outOfScope, ctx.theme.colors.inkMuted);
      }
      break;
    }

    case 'whyNow': {
      header(ctx, layout, 'Why now', slide.title);
      const box = layout.take(380, 40);
      const columns = layout.columns(box, 3, 40);
      const entries: Array<[string, string]> = [
        ['The shift', slide.shift],
        ['Why incumbents are slow', slide.incumbentLag],
        ['Why the window closes', slide.window],
      ];
      entries.forEach(([labelValue, value], index) => {
        const column = columns[index];
        if (!column) return;
        panel(ctx, column);
        label(ctx, labelValue, { x: column.x + 36, y: column.y + 34, w: column.w - 72, h: 34 });
        text(ctx, value, { x: column.x + 36, y: column.y + 84, w: column.w - 72, h: column.h - 120 }, ctx.type.body!);
      });
      if (slide.timeline.length > 0) {
        const strip = layout.take(140);
        layout.columns(strip, slide.timeline.length, 24).forEach((column, index) => {
          const phase = slide.timeline[index];
          if (!phase) return;
          ctx.slide.addShape('rect', {
            ...inches({ x: column.x, y: column.y, w: column.w, h: 3 }),
            fill: { color: hex(ctx.theme.colors.accent) },
            line: { color: hex(ctx.theme.colors.accent), width: 0 },
          });
          label(ctx, phase.label, { x: column.x, y: column.y + 20, w: column.w, h: 34 });
          text(ctx, phase.title, { x: column.x, y: column.y + 62, w: column.w, h: 60 }, ctx.type.body!);
        });
      }
      break;
    }

    case 'market': {
      header(ctx, layout, 'Market', slide.title, slide.lead);
      if (slide.beachhead) {
        const box = layout.take(280, 36);
        panel(ctx, box, true);
        label(ctx, 'Beachhead: who buys in the next 12 months', { x: box.x + 40, y: box.y + 32, w: box.w - 80, h: 34 }, {
          color: hex(ctx.theme.colors.accentBright),
        });
        text(ctx, slide.beachhead.segment, { x: box.x + 40, y: box.y + 80, w: box.w - 80, h: 80 }, ctx.type.lead!, {
          color: hex(ctx.theme.colors.ink),
        });
        if (slide.beachhead.buyerCount) {
          stat(ctx, { x: box.x + 40, y: box.y + 160, w: 400, h: 100 }, slide.beachhead.buyerCount, 'Buyers');
        }
        if (slide.beachhead.price) {
          stat(ctx, { x: box.x + 500, y: box.y + 160, w: 400, h: 100 }, slide.beachhead.price, 'Each pays');
        }
      }
      if (slide.expansion.length > 0) {
        const box = layout.take(220);
        label(ctx, 'Then', { x: box.x, y: box.y, w: box.w, h: 34 });
        rows(
          ctx,
          { ...box, y: box.y + 46, w: slide.broader ? box.w - 520 : box.w },
          slide.expansion.map((item) => ({ body: item.segment })),
          90,
        );
        if (slide.broader) {
          stat(ctx, { x: box.x + box.w - 480, y: box.y + 40, w: 480, h: 160 }, slide.broader.value, slide.broader.label);
        }
      }
      if (slide.source) {
        text(ctx, `Source: ${slide.source}`, { x: layout.pad, y: SLIDE_HEIGHT - layout.pad - 80, w: layout.contentWidth, h: 40 }, ctx.type.small!);
      }
      break;
    }

    case 'product': {
      header(ctx, layout, 'Product', slide.title, slide.lead);
      const box = layout.take(420, 24);
      if (slide.workflow.length > 0) {
        rows(
          ctx,
          box,
          slide.workflow.map((step, index) => ({
            label: String(index + 1).padStart(2, '0'),
            body: step.body ? `${step.title} — ${plainText(step.body)}` : step.title,
          })),
          Math.min(120, box.h / Math.max(slide.workflow.length, 1)),
        );
      }
      if (slide.live.length > 0 || slide.coming.length > 0) {
        const strip = layout.take(180);
        const [liveBox, comingBox] = layout.columns(strip, 2, 48);
        scopeList(ctx, liveBox!, 'Live', slide.live, ctx.theme.colors.positive);
        scopeList(ctx, comingBox!, 'Coming', slide.coming, ctx.theme.colors.caution);
      }
      if (slide.moat) {
        text(
          ctx,
          `Moat: ${plainText(slide.moat)}`,
          { x: layout.pad, y: SLIDE_HEIGHT - layout.pad - 90, w: layout.contentWidth, h: 50 },
          ctx.type.small!,
          { color: hex(ctx.theme.colors.accentBright) },
        );
      }
      break;
    }

    case 'traction': {
      header(ctx, layout, 'Traction', slide.title, slide.lead);
      const box = layout.take(520);
      const ranked = [...slide.evidence].sort((a, b) => evidenceStrength(b) - evidenceStrength(a));
      if (slide.chart) {
        const [left, right] = layout.columns(box, 2, 64);
        rows(
          ctx,
          left!,
          ranked.map((item) => ({
            label: EVIDENCE_LABELS[item.kind],
            body: item.customer ? `${item.label} · ${item.customer}` : item.label,
            right: item.value,
          })),
          Math.min(130, left!.h / Math.max(ranked.length, 1)),
        );
        chart(ctx, slide.chart, { ...right!, h: 440 });
      } else {
        rows(
          ctx,
          box,
          ranked.map((item) => ({
            label: EVIDENCE_LABELS[item.kind],
            body: item.customer ? `${item.label} · ${item.customer}` : item.label,
            right: item.value,
          })),
          Math.min(130, box.h / Math.max(ranked.length, 1)),
        );
      }
      break;
    }

    case 'businessModel': {
      header(ctx, layout, 'Business model', slide.title, slide.lead);
      const box = layout.take(330, 40);
      layout.columns(box, Math.min(Math.max(slide.streams.length, 1), 3), 40).forEach((column, index) => {
        const stream = slide.streams[index];
        if (!stream) return;
        panel(ctx, column);
        label(ctx, stream.name, { x: column.x + 36, y: column.y + 32, w: column.w - 72, h: 34 });
        if (stream.price) {
          text(ctx, stream.price, { x: column.x + 36, y: column.y + 76, w: column.w - 72, h: 90 }, ctx.scale(ctx.type.stat!, 0.55));
        }
        text(ctx, stream.description, { x: column.x + 36, y: column.y + 176, w: column.w - 72, h: 130 }, ctx.type.small!);
      });
      const strip = layout.take(180);
      if (slide.grossMargin) stat(ctx, { x: strip.x, y: strip.y, w: 420, h: 160 }, slide.grossMargin, 'Gross margin');
      if (slide.expansion) {
        label(ctx, 'What expands the account', { x: strip.x + 480, y: strip.y, w: strip.w - 480, h: 34 });
        text(ctx, slide.expansion, { x: strip.x + 480, y: strip.y + 46, w: strip.w - 480, h: 110 }, ctx.type.body!);
      }
      break;
    }

    case 'goToMarket': {
      header(ctx, layout, 'Go to market', slide.title, slide.lead);
      const box = layout.take(300, 36);
      const columns = layout.columns(box, 3, 40);
      const motionLabel = MOTION_LABELS[slide.motion];
      panel(ctx, columns[0]!);
      label(ctx, 'Motion', { x: columns[0]!.x + 36, y: columns[0]!.y + 32, w: columns[0]!.w - 72, h: 34 });
      text(ctx, motionLabel, { x: columns[0]!.x + 36, y: columns[0]!.y + 78, w: columns[0]!.w - 72, h: 60 }, ctx.type.body!);
      text(ctx, slide.whoSells, { x: columns[0]!.x + 36, y: columns[0]!.y + 142, w: columns[0]!.w - 72, h: 120 }, ctx.type.small!);

      panel(ctx, columns[1]!, true);
      label(ctx, 'The one channel', { x: columns[1]!.x + 36, y: columns[1]!.y + 32, w: columns[1]!.w - 72, h: 34 }, {
        color: hex(ctx.theme.colors.accentBright),
      });
      text(ctx, slide.primaryChannel, { x: columns[1]!.x + 36, y: columns[1]!.y + 78, w: columns[1]!.w - 72, h: 180 }, ctx.type.body!);

      panel(ctx, columns[2]!);
      label(ctx, 'CAC', { x: columns[2]!.x + 36, y: columns[2]!.y + 32, w: columns[2]!.w - 72, h: 34 });
      text(ctx, slide.cac || '—', { x: columns[2]!.x + 36, y: columns[2]!.y + 76, w: columns[2]!.w - 72, h: 90 }, ctx.scale(ctx.type.stat!, 0.55));
      text(ctx, slide.cacBasis, { x: columns[2]!.x + 36, y: columns[2]!.y + 176, w: columns[2]!.w - 72, h: 110 }, ctx.type.small!);

      if (slide.steps.length > 0) {
        const strip = layout.take(240);
        label(ctx, 'The first 100 customers', { x: strip.x, y: strip.y, w: strip.w, h: 34 });
        rows(
          ctx,
          { ...strip, y: strip.y + 48 },
          slide.steps.map((step, index) => ({
            label: String(index + 1).padStart(2, '0'),
            body: step.body ? `${step.title} — ${plainText(step.body)}` : step.title,
          })),
          Math.min(110, (strip.h - 48) / Math.max(slide.steps.length, 1)),
        );
      }
      break;
    }

    case 'competition': {
      header(ctx, layout, 'Competition', slide.title, slide.lead);
      if (slide.statusQuo) {
        const box = layout.take(150, 28);
        panel(ctx, box);
        label(ctx, 'The status quo, which is also a competitor', { x: box.x + 32, y: box.y + 26, w: box.w - 64, h: 32 });
        text(ctx, slide.statusQuo, { x: box.x + 32, y: box.y + 68, w: box.w - 64, h: 70 }, ctx.type.body!);
      }
      if (slide.matrix) {
        drawMatrix(ctx, layout, slide.matrix);
      } else if (slide.quadrant) {
        drawQuadrant(ctx, layout, slide.quadrant);
      } else if (slide.alternatives.length > 0) {
        const box = layout.take(340);
        rows(
          ctx,
          box,
          slide.alternatives.map((alternative) => ({
            label: alternative.name,
            body: plainText(alternative.whyNotThem) || plainText(alternative.whatTheyDo),
          })),
          Math.min(120, box.h / Math.max(slide.alternatives.length, 1)),
        );
      }
      if (slide.winningAxis) {
        text(
          ctx,
          `We win on: ${plainText(slide.winningAxis)}`,
          { x: layout.pad, y: SLIDE_HEIGHT - layout.pad - 110, w: layout.contentWidth, h: 70 },
          ctx.type.lead!,
          { color: hex(ctx.theme.colors.ink) },
        );
      }
      break;
    }

    case 'team': {
      header(ctx, layout, 'Team', slide.title, slide.lead);
      const box = layout.take(360, 32);
      layout.columns(box, Math.min(Math.max(slide.people.length, 1), 5), 32).forEach((column, index) => {
        const person = slide.people[index];
        if (!person) return;
        text(ctx, person.name, { x: column.x, y: column.y, w: column.w, h: 50 }, { ...ctx.type.body!, bold: true });
        label(ctx, person.role, { x: column.x, y: column.y + 54, w: column.w, h: 34 });
        text(ctx, person.scar, { x: column.x, y: column.y + 100, w: column.w, h: 160 }, ctx.type.small!, {
          color: hex(ctx.theme.colors.ink),
        });
        if (person.credentials.length > 0) {
          text(ctx, person.credentials.join(' · '), { x: column.x, y: column.y + 268, w: column.w, h: 60 }, ctx.type.small!);
        }
      });
      if (slide.missing) {
        const box2 = layout.take(150);
        panel(ctx, box2);
        label(ctx, `Who is missing${slide.hiredWithRound ? ', and this round hires them' : ''}`, {
          x: box2.x + 32,
          y: box2.y + 26,
          w: box2.w - 64,
          h: 32,
        });
        text(ctx, slide.missing, { x: box2.x + 32, y: box2.y + 68, w: box2.w - 64, h: 70 }, ctx.type.body!);
      }
      break;
    }

    case 'ask': {
      header(ctx, layout, 'The ask', slide.title, slide.lead);
      const box = layout.take(520);
      const [left, right] = layout.columns(box, 2, 72);
      text(ctx, slide.amount, { x: left!.x, y: left!.y, w: left!.w, h: 160 }, {
        ...ctx.scale(ctx.type.display!, 0.55),
        color: hex(ctx.theme.colors.accentBright),
      });
      if (slide.instrument) label(ctx, slide.instrument, { x: left!.x, y: left!.y + 160, w: left!.w, h: 40 });
      if (slide.buys.length > 0) {
        label(ctx, 'What it buys', { x: left!.x, y: left!.y + 220, w: left!.w, h: 34 });
        rows(
          ctx,
          { x: left!.x, y: left!.y + 266, w: left!.w, h: 240 },
          slide.buys.map((use) => ({ body: use.label, right: use.amount })),
          Math.min(100, 240 / Math.max(slide.buys.length, 1)),
        );
      }
      if (slide.outcome.length > 0 && right) {
        panel(ctx, { ...right, h: 380 }, true);
        label(ctx, 'True 18 months from now', { x: right.x + 40, y: right.y + 36, w: right.w - 80, h: 34 }, {
          color: hex(ctx.theme.colors.accentBright),
        });
        slide.outcome.forEach((item, index) => {
          text(ctx, item, { x: right.x + 40, y: right.y + 88 + index * 64, w: right.w - 80, h: 56 }, ctx.type.body!);
        });
      }
      if (slide.nextRound && right) {
        label(ctx, 'Then the next round', { x: right.x, y: right.y + 404, w: right.w, h: 34 });
        text(ctx, slide.nextRound, { x: right.x, y: right.y + 444, w: right.w, h: 80 }, ctx.type.small!);
      }
      break;
    }

    case 'closing': {
      text(ctx, slide.headline, { x: layout.pad, y: 380, w: layout.contentWidth, h: 200 }, ctx.type.hero!, { lineSpacingMultiple: 0.9 });
      if (slide.subhead) text(ctx, slide.subhead, { x: layout.pad, y: 600, w: 1180, h: 100 }, ctx.type.lead!);
      ctx.slide.addShape('rect', {
        ...inches({ x: layout.pad, y: 720, w: 120, h: 4 }),
        fill: { color: hex(ctx.theme.colors.accent) },
        line: { color: hex(ctx.theme.colors.accent), width: 0 },
      });
      const contact = [slide.contactName, slide.email, slide.phone, slide.website].filter(Boolean).join('     ');
      if (contact) label(ctx, contact, { x: layout.pad, y: 790, w: layout.contentWidth, h: 50 });
      break;
    }

    case 'section': {
      if (slide.index !== undefined) {
        text(ctx, String(slide.index).padStart(2, '0'), { x: layout.pad, y: 300, w: 600, h: 240 }, ctx.type.display!);
      }
      text(ctx, slide.title, { x: layout.pad, y: 520, w: layout.contentWidth, h: 160 }, ctx.scale(ctx.type.title!, 1.3));
      if (slide.subtitle) text(ctx, slide.subtitle, { x: layout.pad, y: 690, w: 1180, h: 90 }, ctx.type.lead!);
      break;
    }

    case 'statement': {
      text(ctx, slide.text, { x: layout.pad, y: 340, w: layout.contentWidth, h: 400 }, ctx.scale(ctx.type.hero!, 0.62), {
        lineSpacingMultiple: 1.05,
      });
      if (slide.attribution) label(ctx, slide.attribution, { x: layout.pad, y: 780, w: layout.contentWidth, h: 40 });
      break;
    }

    case 'quote': {
      header(ctx, layout, undefined, '');
      layout.moveTo(280);
      const box = layout.take(400);
      text(ctx, `"${plainText(slide.text)}"`, box, { ...ctx.scale(ctx.type.lead!, 1.5), color: hex(ctx.theme.colors.ink) });
      text(ctx, slide.author, { x: box.x, y: box.y + 420, w: box.w, h: 50 }, ctx.type.body!);
      label(ctx, [slide.role, slide.org].filter(Boolean).join(', '), { x: box.x, y: box.y + 474, w: box.w, h: 40 });
      break;
    }

    case 'agenda': {
      header(ctx, layout, undefined, slide.title);
      const box = layout.take(560);
      rows(
        ctx,
        box,
        slide.items.map((item, index) => ({ label: String(index + 1).padStart(2, '0'), body: item })),
        Math.min(110, box.h / Math.max(slide.items.length, 1)),
      );
      break;
    }

    case 'metrics': {
      header(ctx, layout, slide.period, slide.title);
      const box = layout.take(420);
      layout.columns(box, Math.min(Math.max(slide.stats.length, 1), 4), 40).forEach((column, index) => {
        const item = slide.stats[index];
        if (!item) return;
        panel(ctx, { ...column, h: 300 });
        stat(ctx, { x: column.x + 40, y: column.y + 60, w: column.w - 80, h: 200 }, item.value, item.label, item.note);
      });
      break;
    }

    case 'moat': {
      header(ctx, layout, 'Defensibility', slide.title, slide.lead);
      const box = layout.take(400);
      layout.columns(box, Math.min(Math.max(slide.pillars.length, 1), 4), 40).forEach((column, index) => {
        const pillar = slide.pillars[index];
        if (!pillar) return;
        panel(ctx, column);
        if (pillar.badge) {
          label(ctx, pillar.badge, { x: column.x + 36, y: column.y + 32, w: column.w - 72, h: 34 }, {
            color: hex(ctx.theme.colors.accentBright),
          });
        }
        text(ctx, pillar.title, { x: column.x + 36, y: column.y + 80, w: column.w - 72, h: 70 }, { ...ctx.type.body!, bold: true });
        text(ctx, pillar.body, { x: column.x + 36, y: column.y + 156, w: column.w - 72, h: column.h - 190 }, ctx.type.small!);
      });
      break;
    }

    case 'howItWorks': {
      header(ctx, layout, undefined, slide.title, slide.lead);
      const box = layout.take(420);
      layout.columns(box, slide.steps.length, 32).forEach((column, index) => {
        const step = slide.steps[index];
        if (!step) return;
        label(ctx, String(index + 1).padStart(2, '0'), { x: column.x, y: column.y, w: column.w, h: 34 }, {
          color: hex(ctx.theme.colors.accentBright),
        });
        text(ctx, step.title, { x: column.x, y: column.y + 48, w: column.w, h: 70 }, { ...ctx.type.body!, bold: true });
        text(ctx, step.body, { x: column.x, y: column.y + 126, w: column.w, h: 220 }, ctx.type.small!);
      });
      break;
    }

    case 'roadmap': {
      header(ctx, layout, undefined, slide.title, slide.lead);
      const box = layout.take(420);
      layout.columns(box, Math.min(Math.max(slide.phases.length, 1), 4), 32).forEach((column, index) => {
        const phase = slide.phases[index];
        if (!phase) return;
        const color =
          phase.state === 'done' ? ctx.theme.colors.positive : phase.state === 'active' ? ctx.theme.colors.accent : ctx.theme.colors.border;
        ctx.slide.addShape('rect', {
          ...inches({ x: column.x, y: column.y, w: column.w, h: 4 }),
          fill: { color: hex(color) },
          line: { color: hex(color), width: 0 },
        });
        label(ctx, phase.label, { x: column.x, y: column.y + 24, w: column.w, h: 34 }, { color: hex(color) });
        text(ctx, phase.title, { x: column.x, y: column.y + 70, w: column.w, h: 70 }, { ...ctx.type.body!, bold: true });
        phase.items.forEach((item, itemIndex) => {
          text(ctx, item, { x: column.x, y: column.y + 148 + itemIndex * 50, w: column.w, h: 46 }, ctx.type.small!);
        });
      });
      break;
    }

    case 'financials': {
      header(ctx, layout, undefined, slide.title, slide.lead);
      const box = layout.take(440);
      const split = slide.table && slide.chart ? layout.columns(box, 2, 56) : [box];
      if (slide.table && split[0]) {
        const headerRow: PptxTableCell[] = slide.table.columns.map((column) => ({
          text: labelText(ctx.theme, column.label),
          options: { ...ctx.type.label!, align: column.align, bold: true },
        }));
        const bodyRows: PptxTableCell[][] = slide.table.rows.map((row) =>
          row.cells.map((cell, cellIndex) => ({
            text: cell,
            options: {
              ...ctx.type.body!,
              align: slide.table?.columns[cellIndex]?.align ?? 'left',
              bold: row.emphasis,
              fill: row.emphasis ? { color: hex(ctx.theme.colors.surface) } : undefined,
            },
          })),
        );
        ctx.slide.addTable([headerRow, ...bodyRows], {
          ...inches(split[0]),
          border: [{ type: 'solid', color: hex(ctx.theme.colors.border), pt: 1 }],
          fontFace: ctx.theme.fonts.pptxBody,
          color: hex(ctx.theme.colors.ink),
          valign: 'middle',
          margin: 8,
        });
      }
      if (slide.chart && split[split.length - 1]) chart(ctx, slide.chart, split[split.length - 1]!);
      if (slide.assumptions.length > 0) {
        text(
          ctx,
          `Assumptions: ${slide.assumptions.join(' · ')}`,
          { x: layout.pad, y: SLIDE_HEIGHT - layout.pad - 90, w: layout.contentWidth, h: 50 },
          ctx.type.small!,
        );
      }
      break;
    }

    case 'useOfFunds': {
      header(ctx, layout, undefined, slide.title, slide.lead);
      const box = layout.take(460);
      const [left, right] = layout.columns(box, 2, 64);
      slide.allocations.forEach((allocation, index) => {
        const y = left!.y + index * 92;
        text(ctx, allocation.label, { x: left!.x, y, w: left!.w - 200, h: 44 }, ctx.type.body!);
        text(ctx, `${allocation.percent}%`, { x: left!.x + left!.w - 200, y, w: 200, h: 44 }, ctx.type.body!, {
          align: 'right',
          color: hex(ctx.theme.colors.accentBright),
        });
        ctx.slide.addShape('rect', {
          ...inches({ x: left!.x, y: y + 52, w: left!.w, h: 14 }),
          fill: { color: hex(ctx.theme.colors.surface) },
          line: { color: hex(ctx.theme.colors.surface), width: 0 },
        });
        const barColor = ctx.theme.colors.chart[index % ctx.theme.colors.chart.length] ?? ctx.theme.colors.accent;
        ctx.slide.addShape('rect', {
          ...inches({ x: left!.x, y: y + 52, w: (left!.w * allocation.percent) / 100, h: 14 }),
          fill: { color: hex(barColor) },
          line: { color: hex(barColor), width: 0 },
        });
      });
      if (slide.total && right) stat(ctx, { x: right.x, y: right.y + 40, w: right.w, h: 180 }, slide.total, 'Total raise');
      if (slide.runway && right) stat(ctx, { x: right.x, y: right.y + 250, w: right.w, h: 180 }, slide.runway, 'Runway');
      break;
    }

    case 'logos': {
      header(ctx, layout, undefined, slide.title, slide.lead);
      const box = layout.take(400);
      const perRow = Math.min(Math.max(Math.ceil(slide.logos.length / 2), 2), 5);
      slide.logos.forEach((logo, index) => {
        const columnIndex = index % perRow;
        const rowIndex = Math.floor(index / perRow);
        const width = (box.w - 40 * (perRow - 1)) / perRow;
        const cell = { x: box.x + (width + 40) * columnIndex, y: box.y + rowIndex * 200, w: width, h: 160 };
        panel(ctx, cell);
        text(ctx, logo.name, { x: cell.x + 20, y: cell.y + 62, w: cell.w - 40, h: 50 }, ctx.type.body!, { align: 'center' });
      });
      break;
    }

    case 'bullets': {
      header(ctx, layout, undefined, slide.title, slide.lead);
      const box = layout.take(520);
      rows(
        ctx,
        box,
        slide.bullets.map((bullet) => ({ body: bullet.text })),
        Math.min(110, box.h / Math.max(slide.bullets.length, 1)),
      );
      break;
    }

    case 'image': {
      if (slide.media.src.startsWith('data:') || slide.media.src.startsWith('http')) {
        ctx.slide.addImage({
          ...inches({ x: 0, y: 0, w: SLIDE_WIDTH, h: slide.caption ? SLIDE_HEIGHT - 140 : SLIDE_HEIGHT }),
          ...(slide.media.src.startsWith('data:') ? { data: slide.media.src } : { path: slide.media.src }),
        });
      }
      if (slide.caption) {
        text(ctx, slide.caption, { x: layout.pad, y: SLIDE_HEIGHT - 110, w: layout.contentWidth, h: 60 }, ctx.type.small!);
      }
      break;
    }
  }

  if (!chromeless) footer(ctx);
}

function scopeList(ctx: Ctx, box: Box, title: string, items: string[], color: string): void {
  if (items.length === 0) return;
  label(ctx, title, { x: box.x, y: box.y, w: box.w, h: 34 }, { color: hex(color) });
  items.forEach((item, index) => {
    text(ctx, item, { x: box.x, y: box.y + 48 + index * 52, w: box.w, h: 48 }, ctx.type.small!, {
      color: hex(color),
    });
  });
}

function drawMatrix(ctx: Ctx, layout: SlideLayout, matrix: NonNullable<Extract<Slide, { type: 'competition' }>['matrix']>): void {
  const box = layout.take(340);
  const glyph = { yes: '●', partial: '◐', no: '○' } as const;

  const headerRow: PptxTableCell[] = [
    { text: '', options: ctx.type.label! },
    ...matrix.capabilities.map((capability) => ({
      text: labelText(ctx.theme, capability),
      options: { ...ctx.type.label!, align: 'center' as const },
    })),
  ];

  const bodyRows: PptxTableCell[][] = matrix.competitors.map((competitor, rowIndex) => {
    const us = rowIndex === matrix.usIndex;
    return [
      {
        text: competitor,
        options: {
          ...ctx.type.body!,
          color: hex(us ? ctx.theme.colors.accentBright : ctx.theme.colors.ink),
          bold: us,
          fill: us ? { color: hex(ctx.theme.colors.surface) } : undefined,
        },
      },
      ...matrix.capabilities.map((_, columnIndex) => {
        const mark = matrix.marks[rowIndex]?.[columnIndex] ?? 'no';
        const color =
          mark === 'yes' ? ctx.theme.colors.positive : mark === 'partial' ? ctx.theme.colors.caution : ctx.theme.colors.inkMuted;
        return {
          text: glyph[mark],
          options: {
            ...ctx.type.body!,
            align: 'center' as const,
            color: hex(color),
            fill: us ? { color: hex(ctx.theme.colors.surface) } : undefined,
          },
        };
      }),
    ];
  });

  ctx.slide.addTable([headerRow, ...bodyRows], {
    ...inches(box),
    border: [{ type: 'solid', color: hex(ctx.theme.colors.border), pt: 1 }],
    fontFace: ctx.theme.fonts.pptxBody,
    valign: 'middle',
    margin: 10,
  });
}

/**
 * The 2x2, as real shapes.
 *
 * Drawn rather than skipped: the web renderer and the PDF both show it, and a
 * PowerPoint export that quietly omits the slide's only content is the worst
 * kind of export bug, because the file opens fine.
 */
function drawQuadrant(
  ctx: Ctx,
  layout: SlideLayout,
  quadrant: NonNullable<Extract<Slide, { type: 'competition' }>['quadrant']>,
): void {
  const box = layout.take(420);
  const size = Math.min(box.h, 420);
  const originX = box.x;
  const originY = box.y;

  const axis = (from: Box): void => {
    ctx.slide.addShape('rect', {
      ...inches(from),
      fill: { color: hex(ctx.theme.colors.border) },
      line: { color: hex(ctx.theme.colors.border), width: 0 },
    });
  };
  axis({ x: originX + size / 2, y: originY, w: 2, h: size });
  axis({ x: originX, y: originY + size / 2, w: size, h: 2 });

  for (const point of quadrant.points) {
    const radius = point.us ? 16 : 11;
    const cx = originX + point.x * size - radius;
    const cy = originY + (1 - point.y) * size - radius;
    const color = point.us ? ctx.theme.colors.accent : ctx.theme.colors.inkMuted;

    ctx.slide.addShape('ellipse', {
      ...inches({ x: cx, y: cy, w: radius * 2, h: radius * 2 }),
      fill: { color: hex(color) },
      line: { color: hex(color), width: 0 },
    });
    text(
      ctx,
      point.label,
      { x: cx + radius * 2 + 10, y: cy - 4, w: 380, h: 44 },
      { ...ctx.type.small!, color: hex(point.us ? ctx.theme.colors.accentBright : ctx.theme.colors.inkMuted) },
    );
  }

  const legendX = originX + size + 64;
  label(ctx, 'Horizontal', { x: legendX, y: originY + 40, w: box.w - size - 64, h: 34 });
  text(ctx, `${quadrant.xAxis[0]} to ${quadrant.xAxis[1]}`, { x: legendX, y: originY + 78, w: box.w - size - 64, h: 60 }, ctx.type.small!);
  label(ctx, 'Vertical', { x: legendX, y: originY + 160, w: box.w - size - 64, h: 34 });
  text(ctx, `${quadrant.yAxis[0]} to ${quadrant.yAxis[1]}`, { x: legendX, y: originY + 198, w: box.w - size - 64, h: 60 }, ctx.type.small!);
}
