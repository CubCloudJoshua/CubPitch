import { z } from 'zod';
import {
  Allocation,
  Alternative,
  Beachhead,
  Bullet,
  ChartSpec,
  Evidence,
  FundUse,
  GoToMarketMotion,
  InlineText,
  LogoItem,
  MatrixSpec,
  MediaRef,
  Person,
  Phase,
  Pillar,
  QuadrantSpec,
  RevenueStream,
  Stat,
  Step,
  TableSpec,
} from './blocks.js';

/**
 * Slide types.
 *
 * The set is closed and it follows the house framework: twelve slides, one job
 * each, everything else in an appendix. Fields are named after the job rather
 * than the layout, which is the whole point. A problem slide stores *who
 * hurts* and *what it costs them*, not "bullet 1" and "bullet 2", and that is
 * what lets the tool tell an author the pain is unpriced, re-theme the deck,
 * and export editable PowerPoint from the same document.
 *
 * `bullets` and `image` are escape hatches for content with genuinely no
 * shape. Reach for them last.
 */

const base = {
  id: z.string().min(1),
  /** Speaker notes. Exported to the PowerPoint notes pane, never rendered. */
  notes: z.string().default(''),
  /** Kept in the deck, skipped in presentation and export. */
  hidden: z.boolean().default(false),
};

function slideType<T extends string, S extends z.ZodRawShape>(type: T, shape: S) {
  return z.object({ ...base, type: z.literal(type), ...shape });
}

/**
 * 1. Title. A stranger can repeat what you do.
 *
 * `oneLiner` is the load-bearing field of the entire deck. The framework says
 * to write it before anything else, so it is required here and the review
 * refuses a deck whose one-liner is still a slogan.
 */
export const CoverSlide = slideType('cover', {
  headline: z.string().min(1),
  /** "We help [who] [do what] so they [get this]." A sentence, not a slogan. */
  oneLiner: InlineText.default(''),
  presenter: z.string().optional(),
  date: z.string().optional(),
  logo: MediaRef.optional(),
  background: MediaRef.optional(),
  confidential: z.boolean().default(true),
});

/** 2. Problem. The pain is specific, expensive, and already being paid for badly. */
export const ProblemSlide = slideType('problem', {
  title: z.string().min(1),
  /** One customer, by name or tight segment. Never "everyone". */
  who: InlineText.default(''),
  /** What they do about it today, badly. */
  today: InlineText.default(''),
  /** What that costs them, in time, money, or risk. */
  cost: InlineText.default(''),
  /** Why it is getting worse. */
  worsening: InlineText.default(''),
  stat: Stat.optional(),
  media: MediaRef.optional(),
});

/** 3. Solution. One picture of the product doing the job. Not a feature list. */
export const SolutionSlide = slideType('solution', {
  title: z.string().min(1),
  /** The job you take off their plate. */
  lead: InlineText.default(''),
  before: InlineText.default(''),
  after: InlineText.default(''),
  inScope: z.array(z.string()).default([]),
  outOfScope: z.array(z.string()).default([]),
  media: MediaRef.optional(),
});

/**
 * 4. Why now. Something in the world changed.
 *
 * The framework calls this the slide most decks skip and the one sophisticated
 * investors read twice, so it is a first-class type rather than a bullet list.
 */
export const WhyNowSlide = slideType('whyNow', {
  title: z.string().min(1),
  /** The shift: compute cost, buyer behaviour, regulation, a tool that got cheap. */
  shift: InlineText.default(''),
  /** Why incumbents are slow to answer it. */
  incumbentLag: InlineText.default(''),
  /** Why this window closes. */
  window: InlineText.default(''),
  timeline: z.array(Phase).default([]),
});

/**
 * 5. Market. A path from the customers you can sell this year to a market worth owning.
 *
 * Structured beachhead-first on purpose. The big number is optional, comes
 * last, and is the only field that carries a source requirement.
 */
export const MarketSlide = slideType('market', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  /** Who writes a check in the next twelve months. */
  beachhead: Beachhead.optional(),
  /** Adjacent buyers, after the beachhead is real. */
  expansion: z.array(z.object({ segment: z.string().min(1), note: InlineText.default('') })).default([]),
  /** The big number. Only earns its place when the path above is honest. */
  broader: z.object({ value: z.string().min(1), label: z.string().min(1) }).optional(),
  source: z.string().optional(),
});

/** 6. Product. Deep enough that a sharp person believes you can build it. */
export const ProductSlide = slideType('product', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  /** One core workflow, step by step. */
  workflow: z.array(Step).default([]),
  live: z.array(z.string()).default([]),
  coming: z.array(z.string()).default([]),
  /** Moat in one line: data, workflow, distribution, switching cost. Or nothing. */
  moat: InlineText.default(''),
  media: MediaRef.optional(),
});

/** 7. Traction. Proof the world wants this, typed by strength. */
export const TractionSlide = slideType('traction', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  evidence: z.array(Evidence).default([]),
  chart: ChartSpec.optional(),
});

/** 8. Business model. Who pays, what they pay, how often, what it costs to deliver. */
export const BusinessModelSlide = slideType('businessModel', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  streams: z.array(RevenueStream).default([]),
  /** Rough is fine. Absent is not. */
  grossMargin: z.string().default(''),
  /** What expands the account after they buy. */
  expansion: InlineText.default(''),
});

/** 9. Go to market. The first 100 customers, not a brand campaign. */
export const GoToMarketSlide = slideType('goToMarket', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  motion: GoToMarketMotion.default('founder-led'),
  whoSells: InlineText.default(''),
  /** The one channel you will starve the others for. */
  primaryChannel: InlineText.default(''),
  cac: z.string().default(''),
  /** How the CAC is defended, or how this round learns it. */
  cacBasis: InlineText.default(''),
  steps: z.array(Step).default([]),
});

/** 10. Competition. Why the customer you named picks you. */
export const CompetitionSlide = slideType('competition', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  /** Spreadsheets, a VA, doing nothing. The competitor most decks omit. */
  statusQuo: InlineText.default(''),
  alternatives: z.array(Alternative).default([]),
  /** The one axis you actually win on. */
  winningAxis: InlineText.default(''),
  matrix: MatrixSpec.optional(),
  quadrant: QuadrantSpec.optional(),
});

/** 11. Team. Why this group ships this, not a resume dump. */
export const TeamSlide = slideType('team', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  people: z.array(Person).default([]),
  /** Who is missing. Saying it is a strength, not an admission. */
  missing: InlineText.default(''),
  /** Whether this round hires them. */
  hiredWithRound: z.boolean().default(true),
  /** Only people who will take a call this month. */
  advisors: z.array(Person).default([]),
});

/** 12. The ask. A number and an eighteen-month outcome. */
export const AskSlide = slideType('ask', {
  title: z.string().min(1),
  amount: z.string().min(1),
  instrument: z.string().default(''),
  lead: InlineText.default(''),
  /** What it buys: hire, build, sell. In dollars. */
  buys: z.array(FundUse).default([]),
  /** What is true eighteen months later. */
  outcome: z.array(z.string()).default([]),
  /** What the next round looks like if this one works. */
  nextRound: InlineText.default(''),
});

// --- Supporting and appendix types -----------------------------------------

export const AgendaSlide = slideType('agenda', {
  title: z.string().default('Agenda'),
  items: z.array(z.string()).min(1),
});

export const SectionSlide = slideType('section', {
  title: z.string().min(1),
  subtitle: InlineText.default(''),
  index: z.number().int().positive().optional(),
  variant: z.enum(['section', 'appendix']).default('section'),
});

/** One sentence at full size. The slide you use when the sentence is the point. */
export const StatementSlide = slideType('statement', {
  text: InlineText,
  attribution: z.string().optional(),
});

export const HowItWorksSlide = slideType('howItWorks', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  steps: z.array(Step).min(2),
});

export const MetricsSlide = slideType('metrics', {
  title: z.string().min(1),
  period: z.string().optional(),
  stats: z.array(Stat).min(1),
});

export const MoatSlide = slideType('moat', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  pillars: z.array(Pillar).min(1),
});

export const RoadmapSlide = slideType('roadmap', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  phases: z.array(Phase).min(1),
});

export const FinancialsSlide = slideType('financials', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  table: TableSpec.optional(),
  chart: ChartSpec.optional(),
  assumptions: z.array(z.string()).default([]),
});

export const UseOfFundsSlide = slideType('useOfFunds', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  total: z.string().optional(),
  runway: z.string().optional(),
  allocations: z.array(Allocation).min(1),
});

export const LogosSlide = slideType('logos', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  logos: z.array(LogoItem).min(1),
});

export const QuoteSlide = slideType('quote', {
  text: InlineText,
  author: z.string().min(1),
  role: z.string().optional(),
  org: z.string().optional(),
  photo: MediaRef.optional(),
});

export const ClosingSlide = slideType('closing', {
  headline: z.string().min(1),
  subhead: InlineText.default(''),
  contactName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
});

export const BulletsSlide = slideType('bullets', {
  title: z.string().min(1),
  lead: InlineText.default(''),
  bullets: z.array(Bullet).min(1),
});

export const ImageSlide = slideType('image', {
  media: MediaRef,
  title: z.string().optional(),
  caption: z.string().optional(),
});

export const Slide = z.discriminatedUnion('type', [
  CoverSlide,
  ProblemSlide,
  SolutionSlide,
  WhyNowSlide,
  MarketSlide,
  ProductSlide,
  TractionSlide,
  BusinessModelSlide,
  GoToMarketSlide,
  CompetitionSlide,
  TeamSlide,
  AskSlide,
  AgendaSlide,
  SectionSlide,
  StatementSlide,
  HowItWorksSlide,
  MetricsSlide,
  MoatSlide,
  RoadmapSlide,
  FinancialsSlide,
  UseOfFundsSlide,
  LogosSlide,
  QuoteSlide,
  ClosingSlide,
  BulletsSlide,
  ImageSlide,
]);

export type Slide = z.infer<typeof Slide>;
export type SlideType = Slide['type'];
export type SlideOf<T extends SlideType> = Extract<Slide, { type: T }>;

export const SLIDE_TYPES = [
  'cover',
  'problem',
  'solution',
  'whyNow',
  'market',
  'product',
  'traction',
  'businessModel',
  'goToMarket',
  'competition',
  'team',
  'ask',
  'agenda',
  'section',
  'statement',
  'howItWorks',
  'metrics',
  'moat',
  'roadmap',
  'financials',
  'useOfFunds',
  'logos',
  'quote',
  'closing',
  'bullets',
  'image',
] as const satisfies readonly SlideType[];

export const SLIDE_LABELS: Record<SlideType, string> = {
  cover: 'Title',
  problem: 'Problem',
  solution: 'Solution',
  whyNow: 'Why now',
  market: 'Market',
  product: 'Product',
  traction: 'Traction',
  businessModel: 'Business model',
  goToMarket: 'Go to market',
  competition: 'Competition',
  team: 'Team',
  ask: 'The ask',
  agenda: 'Agenda',
  section: 'Section divider',
  statement: 'Statement',
  howItWorks: 'How it works',
  metrics: 'Metrics',
  moat: 'Defensibility',
  roadmap: 'Roadmap',
  financials: 'Financials',
  useOfFunds: 'Use of funds',
  logos: 'Logos',
  quote: 'Quote',
  closing: 'Closing',
  bullets: 'Bullets',
  image: 'Image',
};

/** The heading shown for a slide in the rail, whatever its shape. */
export function slideTitle(slide: Slide): string {
  switch (slide.type) {
    case 'cover':
    case 'closing':
      return slide.headline;
    case 'statement':
      return slide.text;
    case 'quote':
      return `"${slide.text}"`;
    case 'image':
      return slide.title ?? slide.caption ?? 'Image';
    default:
      return slide.title;
  }
}

/** Every string on a slide that an author wrote, for word counts and reviews. */
export function slideProse(slide: Slide): string[] {
  const out: string[] = [];
  const push = (...values: (string | undefined)[]) => {
    for (const value of values) if (value) out.push(value);
  };

  switch (slide.type) {
    case 'cover':
      push(slide.headline, slide.oneLiner, slide.presenter);
      break;
    case 'problem':
      push(slide.title, slide.who, slide.today, slide.cost, slide.worsening, slide.stat?.value, slide.stat?.label);
      break;
    case 'solution':
      push(slide.title, slide.lead, slide.before, slide.after, ...slide.inScope, ...slide.outOfScope);
      break;
    case 'whyNow':
      push(slide.title, slide.shift, slide.incumbentLag, slide.window);
      for (const phase of slide.timeline) push(phase.label, phase.title, ...phase.items);
      break;
    case 'market':
      push(slide.title, slide.lead, slide.beachhead?.segment, slide.beachhead?.buyerCount, slide.beachhead?.price);
      for (const item of slide.expansion) push(item.segment, item.note);
      push(slide.broader?.value, slide.broader?.label, slide.source);
      break;
    case 'product':
      push(slide.title, slide.lead, slide.moat, ...slide.live, ...slide.coming);
      for (const step of slide.workflow) push(step.title, step.body);
      break;
    case 'traction':
      push(slide.title, slide.lead);
      for (const item of slide.evidence) push(item.value, item.label, item.customer, item.note);
      break;
    case 'businessModel':
      push(slide.title, slide.lead, slide.grossMargin, slide.expansion);
      for (const stream of slide.streams) push(stream.name, stream.description, stream.price);
      break;
    case 'goToMarket':
      push(slide.title, slide.lead, slide.whoSells, slide.primaryChannel, slide.cac, slide.cacBasis);
      for (const step of slide.steps) push(step.title, step.body);
      break;
    case 'competition':
      push(slide.title, slide.lead, slide.statusQuo, slide.winningAxis);
      for (const alt of slide.alternatives) push(alt.name, alt.whatTheyDo, alt.whyNotThem);
      break;
    case 'team':
      push(slide.title, slide.lead, slide.missing);
      for (const person of [...slide.people, ...slide.advisors]) {
        push(person.name, person.role, person.scar, ...person.credentials);
      }
      break;
    case 'ask':
      push(slide.title, slide.amount, slide.instrument, slide.lead, slide.nextRound, ...slide.outcome);
      for (const use of slide.buys) push(use.label, use.amount, use.detail);
      break;
    case 'agenda':
      push(slide.title, ...slide.items);
      break;
    case 'section':
      push(slide.title, slide.subtitle);
      break;
    case 'statement':
      push(slide.text, slide.attribution);
      break;
    case 'howItWorks':
      push(slide.title, slide.lead);
      for (const step of slide.steps) push(step.title, step.body);
      break;
    case 'metrics':
      push(slide.title, slide.period);
      for (const stat of slide.stats) push(stat.value, stat.label, stat.note);
      break;
    case 'moat':
      push(slide.title, slide.lead);
      for (const pillar of slide.pillars) push(pillar.badge, pillar.title, pillar.body);
      break;
    case 'roadmap':
      push(slide.title, slide.lead);
      for (const phase of slide.phases) push(phase.label, phase.title, ...phase.items);
      break;
    case 'financials':
      push(slide.title, slide.lead, ...slide.assumptions);
      for (const row of slide.table?.rows ?? []) push(...row.cells);
      break;
    case 'useOfFunds':
      push(slide.title, slide.lead, slide.total, slide.runway);
      for (const item of slide.allocations) push(item.label, item.note);
      break;
    case 'logos':
      push(slide.title, slide.lead);
      for (const logo of slide.logos) push(logo.name, logo.note);
      break;
    case 'quote':
      push(slide.text, slide.author, slide.role, slide.org);
      break;
    case 'closing':
      push(slide.headline, slide.subhead, slide.contactName, slide.email, slide.website);
      break;
    case 'bullets':
      push(slide.title, slide.lead, ...slide.bullets.map((bullet) => bullet.text));
      break;
    case 'image':
      push(slide.title, slide.caption, slide.media.alt);
      break;
  }

  return out;
}
