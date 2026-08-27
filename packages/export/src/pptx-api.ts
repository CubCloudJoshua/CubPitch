import PptxGenJSModule from 'pptxgenjs';

/**
 * The PowerPoint surface this package uses.
 *
 * pptxgenjs ships its option types inside a namespace merged onto a default
 * export, which the compiler will not follow through the package's CommonJS
 * type entry. Rather than scatter `any` across the exporter, the surface we
 * actually depend on is declared once, here, and the cast happens in exactly
 * one place.
 *
 * The upside of being forced into this: the exporter now documents its own
 * dependency. Anything not in this file is not something an upgrade can break.
 */

export type HAlign = 'left' | 'center' | 'right' | 'justify';
export type VAlign = 'top' | 'middle' | 'bottom';

export interface PptxPosition {
  x: number;
  y: number;
  w: number;
  h?: number;
}

export interface PptxFill {
  color: string;
  transparency?: number;
}

export interface PptxLine {
  color: string;
  width?: number;
  dashType?: 'solid' | 'dash' | 'dashDot' | 'lgDash' | 'sysDash';
}

export interface PptxTextOptions extends Partial<PptxPosition> {
  fontSize?: number;
  fontFace?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: HAlign;
  valign?: VAlign;
  charSpacing?: number;
  lineSpacingMultiple?: number;
  breakLine?: boolean;
  bullet?: boolean | { type?: 'bullet' | 'number'; characterCode?: string; indent?: number };
  margin?: number | [number, number, number, number];
  isTextBox?: boolean;
  fit?: 'none' | 'shrink' | 'resize';
  fill?: PptxFill;
  line?: PptxLine;
  wrap?: boolean;
  paraSpaceAfter?: number;
  paraSpaceBefore?: number;
}

export interface PptxTextRun {
  text: string;
  options?: PptxTextOptions;
}

export interface PptxShapeOptions extends PptxPosition {
  fill?: PptxFill;
  line?: PptxLine;
  rectRadius?: number;
  rotate?: number;
}

export type PptxShapeName = 'rect' | 'roundRect' | 'ellipse' | 'line' | 'triangle' | 'chevron';

export interface PptxTableCellOptions extends PptxTextOptions {
  colspan?: number;
  rowspan?: number;
  border?: Array<{ type?: 'solid' | 'none'; color?: string; pt?: number }>;
}

export interface PptxTableCell {
  text: string;
  options?: PptxTableCellOptions;
}

export interface PptxTableOptions extends PptxPosition {
  colW?: number[];
  rowH?: number | number[];
  fontSize?: number;
  fontFace?: string;
  color?: string;
  border?: Array<{ type?: 'solid' | 'none'; color?: string; pt?: number }>;
  fill?: PptxFill;
  margin?: number | [number, number, number, number];
  valign?: VAlign;
  autoPage?: boolean;
}

export type PptxChartType = 'area' | 'bar' | 'doughnut' | 'line' | 'pie' | 'radar' | 'scatter';

export interface PptxChartSeries {
  name: string;
  labels: string[];
  values: number[];
}

export interface PptxChartOptions extends PptxPosition {
  barDir?: 'bar' | 'col';
  barGrouping?: 'clustered' | 'stacked' | 'percentStacked';
  chartColors?: string[];
  showLegend?: boolean;
  legendPos?: 'b' | 't' | 'l' | 'r';
  legendColor?: string;
  legendFontSize?: number;
  showValue?: boolean;
  showTitle?: boolean;
  catAxisLabelColor?: string;
  catAxisLabelFontSize?: number;
  catAxisLineShow?: boolean;
  valAxisLabelColor?: string;
  valAxisLabelFontSize?: number;
  valAxisLineShow?: boolean;
  valGridLine?: { color?: string; style?: 'solid' | 'dash' | 'none'; size?: number };
  catGridLine?: { color?: string; style?: 'solid' | 'dash' | 'none'; size?: number };
  dataLabelColor?: string;
  dataLabelFontSize?: number;
  dataLabelFormatCode?: string;
  lineSmooth?: boolean;
  lineSize?: number;
  fill?: string;
  holeSize?: number;
  chartArea?: { fill?: PptxFill };
  plotArea?: { fill?: PptxFill };
}

export interface PptxImageOptions extends PptxPosition {
  path?: string;
  data?: string;
  sizing?: { type: 'cover' | 'contain' | 'crop'; w: number; h: number };
  rounding?: boolean;
}

export interface PptxSlide {
  background: { color?: string; data?: string; path?: string };
  addText(text: string | PptxTextRun[], options?: PptxTextOptions): PptxSlide;
  addShape(shape: PptxShapeName, options: PptxShapeOptions): PptxSlide;
  addTable(rows: PptxTableCell[][], options?: PptxTableOptions): PptxSlide;
  addChart(type: PptxChartType, data: PptxChartSeries[], options?: PptxChartOptions): PptxSlide;
  addImage(options: PptxImageOptions): PptxSlide;
  addNotes(notes: string): PptxSlide;
}

export interface PptxPresentation {
  layout: string;
  author: string;
  company: string;
  title: string;
  subject: string;
  defineLayout(layout: { name: string; width: number; height: number }): void;
  addSlide(): PptxSlide;
  write(options: { outputType: 'nodebuffer'; compression?: boolean }): Promise<Buffer>;
}

type PptxConstructor = new () => PptxPresentation;

/** The single cast. Verified against pptxgenjs 4.0.1 at runtime, not assumed. */
export function createPresentation(): PptxPresentation {
  const Ctor = PptxGenJSModule as unknown as PptxConstructor;
  return new Ctor();
}
