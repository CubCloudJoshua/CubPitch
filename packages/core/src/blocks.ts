import { z } from 'zod';

/**
 * Content primitives shared across slide types.
 *
 * A pitch deck is not a pile of text boxes. Every value on a slide has a
 * meaning the tool understands, which is what lets one deck be re-themed,
 * re-ordered, exported to PowerPoint as editable shapes, and critiqued later
 * without anyone reverse-engineering a layout.
 */

/**
 * Inline text supporting a deliberately tiny markup: `**bold**` and `*italic*`.
 *
 * Full rich text would mean a document model, a caret, and a serialisation
 * format in every export target. Two markers cover what a pitch slide actually
 * needs and map cleanly onto PowerPoint text runs.
 */
export const InlineText = z.string();
export type InlineText = z.infer<typeof InlineText>;

export const MediaRef = z.object({
  /**
   * Absolute URL, or a `data:` URI for assets embedded in the deck itself.
   *
   * Empty is legal. Adding an image slide and choosing the image are two
   * separate acts, and a schema that rejects the gap between them is a schema
   * that loses the author's work when they add the slide first.
   */
  src: z.string().default(''),
  alt: z.string().default(''),
  fit: z.enum(['cover', 'contain']).default('cover'),
  /** Focal point as fractions of width/height, used when cropping to `cover`. */
  focus: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
});
export type MediaRef = z.infer<typeof MediaRef>;

/** A headline number: "1,240", "$4.2M", "3.1x". Formatting is the author's. */
export const Stat = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  /** Change indicator shown beside the value, e.g. "+180% YoY". */
  delta: z.string().optional(),
  trend: z.enum(['up', 'down', 'flat']).optional(),
  note: z.string().optional(),
});
export type Stat = z.infer<typeof Stat>;

/** One of the three-to-four supporting ideas under a headline claim. */
export const Pillar = z.object({
  title: z.string().min(1),
  body: InlineText.default(''),
  /** Short eyebrow above the title, e.g. "01" or "SOVEREIGN". */
  badge: z.string().optional(),
  icon: MediaRef.optional(),
});
export type Pillar = z.infer<typeof Pillar>;

export const Step = z.object({
  title: z.string().min(1),
  body: InlineText.default(''),
});
export type Step = z.infer<typeof Step>;

export const Bullet = z.object({
  text: InlineText,
  /** Renders at full weight instead of muted. Use for the line that matters. */
  emphasis: z.boolean().default(false),
});
export type Bullet = z.infer<typeof Bullet>;

export const ChartPoint = z.object({
  label: z.string(),
  value: z.number(),
});
export type ChartPoint = z.infer<typeof ChartPoint>;

export const ChartSeries = z.object({
  name: z.string().min(1),
  points: z.array(ChartPoint).min(1),
});
export type ChartSeries = z.infer<typeof ChartSeries>;

export const ValueFormat = z.enum(['number', 'currency', 'percent', 'compact']);
export type ValueFormat = z.infer<typeof ValueFormat>;

export const ChartSpec = z.object({
  kind: z.enum(['bar', 'stackedBar', 'line', 'area', 'donut']),
  series: z.array(ChartSeries).min(1),
  format: ValueFormat.default('number'),
  currency: z.string().default('USD'),
  axisLabel: z.string().optional(),
  /** Where the numbers came from. An unsourced chart is a liability. */
  source: z.string().optional(),
  showLegend: z.boolean().default(true),
  showValues: z.boolean().default(false),
});
export type ChartSpec = z.infer<typeof ChartSpec>;

export const TableColumn = z.object({
  label: z.string(),
  align: z.enum(['left', 'right', 'center']).default('left'),
});
export type TableColumn = z.infer<typeof TableColumn>;

export const TableRow = z.object({
  cells: z.array(z.string()),
  /** Totals, subtotals, and the row the audience should land on. */
  emphasis: z.boolean().default(false),
});
export type TableRow = z.infer<typeof TableRow>;

export const TableSpec = z.object({
  columns: z.array(TableColumn).min(1),
  rows: z.array(TableRow),
  source: z.string().optional(),
});
export type TableSpec = z.infer<typeof TableSpec>;

export const Person = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  /**
   * The relevant scar, in one line: the thing this person has already survived
   * that makes them the one to do this. Not a resume line. "Ran the ERCOT
   * interconnection queue for 6 years" beats "20 years in energy".
   */
  scar: InlineText.default(''),
  photo: MediaRef.optional(),
  /** Prior companies or credentials worth naming. Kept short on purpose. */
  credentials: z.array(z.string()).default([]),
});
export type Person = z.infer<typeof Person>;

export const LogoItem = z.object({
  name: z.string().min(1),
  image: MediaRef.optional(),
  note: z.string().optional(),
});
export type LogoItem = z.infer<typeof LogoItem>;

export const Phase = z.object({
  /** Time handle: "Q4 2026", "Now", "Year 2". */
  label: z.string().min(1),
  title: z.string().min(1),
  items: z.array(z.string()).default([]),
  state: z.enum(['done', 'active', 'planned']).default('planned'),
});
export type Phase = z.infer<typeof Phase>;

export const Allocation = z.object({
  label: z.string().min(1),
  percent: z.number().min(0).max(100),
  note: z.string().optional(),
});
export type Allocation = z.infer<typeof Allocation>;

export const MatrixMark = z.enum(['yes', 'partial', 'no']);
export type MatrixMark = z.infer<typeof MatrixMark>;

/**
 * A capability grid. `marks[rowIndex][columnIndex]` where rows are competitors
 * and columns are capabilities.
 *
 * `usIndex` points at the row that is us. It is a row like any other on
 * purpose: a matrix where our column is structurally privileged reads as
 * marketing, and every investor has seen that trick.
 */
export const MatrixSpec = z.object({
  competitors: z.array(z.string()).min(2),
  capabilities: z.array(z.string()).min(1),
  marks: z.array(z.array(MatrixMark)),
  usIndex: z.number().int().min(0),
});
export type MatrixSpec = z.infer<typeof MatrixSpec>;

/** A 2x2 positioning chart. Coordinates are 0..1 in each axis. */
export const QuadrantSpec = z.object({
  xAxis: z.tuple([z.string(), z.string()]),
  yAxis: z.tuple([z.string(), z.string()]),
  points: z.array(
    z.object({
      label: z.string().min(1),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      us: z.boolean().default(false),
    }),
  ),
});
export type QuadrantSpec = z.infer<typeof QuadrantSpec>;

/** Nested market sizing. Values are pre-formatted strings for the same reason
 *  stats are: "$4.1B" is an authored claim, not a computed one. */
export const MarketTier = z.object({
  key: z.enum(['tam', 'sam', 'som']),
  value: z.string().min(1),
  label: z.string().min(1),
  note: z.string().optional(),
});
export type MarketTier = z.infer<typeof MarketTier>;

export const RevenueStream = z.object({
  name: z.string().min(1),
  description: InlineText.default(''),
  price: z.string().optional(),
  share: z.number().min(0).max(100).optional(),
});
export type RevenueStream = z.infer<typeof RevenueStream>;

/**
 * Evidence, ranked.
 *
 * The framework is explicit that proof has an order of strength: revenue, then
 * retention, then paid pilots, then deposits, then letters of intent from
 * people with budget. Logos without money are weak and "in talks" is weaker.
 * Typing the evidence is what lets the deck warn an author that their traction
 * slide is three logos and a conversation.
 */
export const EvidenceKind = z.enum([
  'revenue',
  'retention',
  'paidPilot',
  'deposit',
  'loi',
  'waitlist',
  'logo',
  'talks',
]);
export type EvidenceKind = z.infer<typeof EvidenceKind>;

/** Higher is stronger. Used to sort a traction slide and to flag a weak one. */
export const EVIDENCE_STRENGTH: Record<EvidenceKind, number> = {
  revenue: 100,
  retention: 90,
  paidPilot: 75,
  deposit: 60,
  loi: 45,
  waitlist: 25,
  logo: 15,
  talks: 0,
};

export const EVIDENCE_LABELS: Record<EvidenceKind, string> = {
  revenue: 'Revenue',
  retention: 'Retention',
  paidPilot: 'Paid pilot',
  deposit: 'Deposit',
  loi: 'Letter of intent',
  waitlist: 'Waitlist',
  logo: 'Logo',
  talks: 'In talks',
};

export const Evidence = z.object({
  kind: EvidenceKind,
  /** The number: "$41K MRR", "94% net revenue retention", "3 paid pilots". */
  value: z.string().min(1),
  label: z.string().min(1),
  /** Who, by name. The framework is blunt that names beat categories. */
  customer: z.string().optional(),
  note: z.string().optional(),
});
export type Evidence = z.infer<typeof Evidence>;

export function evidenceStrength(evidence: Evidence): number {
  return EVIDENCE_STRENGTH[evidence.kind];
}

/** The segment you can actually sell to this year. */
export const Beachhead = z.object({
  segment: z.string().min(1),
  /** How many buyers exist in it, named or counted. */
  buyerCount: z.string().default(''),
  /** What one of them pays. */
  price: z.string().default(''),
  note: z.string().optional(),
});
export type Beachhead = z.infer<typeof Beachhead>;

export const GoToMarketMotion = z.enum([
  'founder-led',
  'outbound',
  'inbound',
  'partner',
  'product-led',
  'channel',
]);
export type GoToMarketMotion = z.infer<typeof GoToMarketMotion>;

export const MOTION_LABELS: Record<GoToMarketMotion, string> = {
  'founder-led': 'Founder-led sales',
  outbound: 'Outbound',
  inbound: 'Inbound',
  partner: 'Partnerships',
  'product-led': 'Product-led',
  channel: 'Channel / reseller',
};

/** One real alternative the named customer could pick instead. */
export const Alternative = z.object({
  name: z.string().min(1),
  whatTheyDo: InlineText.default(''),
  /** Why the customer you named does not pick them. */
  whyNotThem: InlineText.default(''),
});
export type Alternative = z.infer<typeof Alternative>;

/** A dollar-denominated line in the ask. "Vibes" is not a category. */
export const FundUse = z.object({
  label: z.string().min(1),
  amount: z.string().min(1),
  detail: InlineText.default(''),
});
export type FundUse = z.infer<typeof FundUse>;
