import type { SlideType } from './slide.js';

/**
 * Pitch methodologies.
 *
 * There is no single right deck. Sequoia wants "Why now" and treats financials
 * as a main-flow slide; Y Combinator pushes traction to the front because at
 * seed it is the only thing that is not a claim; Kawasaki caps the whole thing
 * at ten slides and thirty-point type. A tool that hardcodes one of these is
 * arguing with its user.
 *
 * So a methodology is data, not code: an ordered list of steps, each pointing
 * at a slide type and carrying that methodology's own name and guidance for it.
 * Adding one is a literal, not a patch. The slide types stay closed, which is
 * what keeps the renderer and the PowerPoint exporter finite.
 */

export interface SlideBrief {
  /** What this slide is for, in one line. */
  job: string;
  /** The questions it has to answer. Shown beside the fields in the editor. */
  prompts: string[];
  /** How the author knows it worked. */
  test?: string;
  /** The trap this slide falls into. */
  warning?: string;
}

export interface MethodologyStep {
  type: SlideType;
  /** This methodology's own name for the slide, which is not always the type's. */
  label: string;
  brief: SlideBrief;
  /** Recommended but not counted as missing when absent. */
  optional?: boolean;
}

export interface WorkingRule {
  id: string;
  rule: string;
}

export interface Methodology {
  id: string;
  name: string;
  /** Who this comes from. Attribution matters when the advice is opinionated. */
  source: string;
  summary: string;
  steps: MethodologyStep[];
  rules: WorkingRule[];
  /** Spoken length the methodology budgets for. */
  targetMinutes: number;
  targetSlides: { min: number; max: number };
  /** Kawasaki's third number. Enforced against the theme when set. */
  minFontPt?: number;
  /** Types this methodology considers appendix material. */
  appendixTypes: SlideType[];
}

// --- Shared rules -----------------------------------------------------------

const RULE_ONE_IDEA: WorkingRule = {
  id: 'one-idea',
  rule: 'One idea per slide. Two is already a second slide.',
};
const RULE_CONCLUSION_TITLE: WorkingRule = {
  id: 'conclusion-title',
  rule: 'Title the slide with the conclusion, not the topic. "Gyms already pay $400/mo to stop churn", not "Market".',
};
const RULE_NUMBERS: WorkingRule = {
  id: 'numbers-over-adjectives',
  rule: 'Numbers beat adjectives. Names beat categories.',
};
const RULE_NINETY: WorkingRule = {
  id: 'ninety-seconds',
  rule: 'Read it out loud. A slide over 90 seconds is two slides, or it is mush.',
};
const RULE_CONVERSATION: WorkingRule = {
  id: 'supports-conversation',
  rule: 'The deck supports a conversation. If they never look down, you are winning.',
};

// --- House ------------------------------------------------------------------

const HOUSE: Methodology = {
  id: 'house',
  name: 'House framework',
  source: 'CubCloud, adapted from Sequoia',
  summary:
    'Twelve slides, one job each, twenty minutes. Beachhead before TAM, evidence ranked by strength, and anything without a number or a name goes to the appendix.',
  targetMinutes: 20,
  targetSlides: { min: 10, max: 14 },
  appendixTypes: ['financials', 'useOfFunds', 'metrics', 'roadmap', 'moat', 'howItWorks', 'logos'],
  rules: [RULE_ONE_IDEA, RULE_CONCLUSION_TITLE, RULE_NUMBERS, RULE_NINETY, RULE_CONVERSATION],
  steps: [
    {
      type: 'cover',
      label: 'Title',
      brief: {
        job: 'A stranger can repeat what you do.',
        prompts: [
          'Company name.',
          'One sentence: who it is for, what it does, what they get.',
          'Fill in: We help [who] [do what] so they [get this].',
        ],
        test: 'Can a stranger repeat it back after hearing it once?',
        warning: 'Not a slogan. Not a category. A sentence.',
      },
    },
    {
      type: 'problem',
      label: 'Problem',
      brief: {
        job: 'The pain is specific, expensive, and already being paid for badly.',
        prompts: [
          'Who hurts. One customer, not "everyone".',
          'What they do about it today.',
          'What it costs them in time, money, or risk.',
          'Why it is getting worse.',
        ],
        test: 'Would that customer nod in the first 20 seconds?',
      },
    },
    {
      type: 'solution',
      label: 'Solution',
      brief: {
        job: 'One picture of the product doing the job. Not a feature list.',
        prompts: ['The job you take off their plate.', 'Before and after, in one workflow.', 'What is in scope and what is out.'],
        test: 'Can you point at the screen and say "this is the product"?',
      },
    },
    {
      type: 'whyNow',
      label: 'Why now',
      brief: {
        job: 'Something in the world changed. This was not a good company five years ago.',
        prompts: [
          'The shift: cost of compute, buyer behavior, regulation, a tool that just got cheap.',
          'Why incumbents are slow.',
          'Why this window closes.',
        ],
        warning: 'The slide most decks skip and the one sophisticated investors read twice.',
      },
    },
    {
      type: 'market',
      label: 'Market',
      brief: {
        job: 'A path from the customers you can sell this year to a market worth owning.',
        prompts: [
          'This year: the named beachhead, how many buyers, what they pay.',
          'Next: adjacent buyers.',
          'Only then a big number, and only if the path is honest.',
        ],
        warning: 'Do not open with TAM theater. Start with who writes a check in the next 12 months.',
      },
    },
    {
      type: 'product',
      label: 'Product',
      brief: {
        job: 'How it works, deep enough that a sharp person believes you can build it.',
        prompts: [
          'One core workflow, step by step.',
          'What is live and what is coming.',
          'Moat in one line: data, workflow, distribution, switching cost.',
        ],
        warning: 'If you do not have a moat, do not fake one.',
      },
    },
    {
      type: 'traction',
      label: 'Traction',
      brief: {
        job: 'Proof the world wants this.',
        prompts: [
          'Strongest evidence first: revenue, retention, paid pilots, deposits, letters of intent from people with budget.',
          'Name the customers.',
        ],
        warning:
          'Logos without money are weak. "In talks" is weaker. If this slide is empty the round is early and the rest of the deck has to be sharper, not longer.',
      },
    },
    {
      type: 'businessModel',
      label: 'Business model',
      brief: {
        job: 'Who pays, what they pay, how often, and what it costs you to deliver.',
        prompts: ['Price and packaging.', 'Gross margin, even if rough.', 'What expands the account after they buy.'],
        warning: 'If you cannot say how you take money, you do not have a business yet.',
      },
    },
    {
      type: 'goToMarket',
      label: 'Go to market',
      brief: {
        job: 'The first 100 customers, not a brand campaign.',
        prompts: [
          'Who sells: founder, partners, inbound.',
          'The motion: outbound, partner, product-led.',
          'A CAC you can defend, or a plan to learn it with this round.',
          'One channel you will starve the others for.',
        ],
        warning: '"We will do content and LinkedIn" is not a motion.',
      },
    },
    {
      type: 'competition',
      label: 'Competition',
      brief: {
        job: 'Why the customer you named picks you.',
        prompts: [
          'The status quo is a competitor: spreadsheets, a VA, doing nothing.',
          'Three to five real alternatives.',
          'One axis you actually win on.',
        ],
        warning: 'Never "we have no competition". Never a 2x2 where you are alone in the top right unless it is true and obvious.',
      },
    },
    {
      type: 'team',
      label: 'Team',
      brief: {
        job: 'Why this group ships this, not a resume dump.',
        prompts: [
          'Three to five people, one line each: the relevant scar.',
          'Who is missing, and whether this round hires them.',
          'Advisors only if they will take a call this month.',
        ],
      },
    },
    {
      type: 'ask',
      label: 'The ask',
      brief: {
        job: 'The round is a machine with a number and an eighteen-month outcome.',
        prompts: [
          'How much.',
          'What it buys: hire, build, sell. In dollars, not vibes.',
          'What is true eighteen months later: revenue, customers, product.',
          'What the next round looks like if this one works.',
        ],
        warning: 'End on this slide. Leave it up.',
      },
    },
  ],
};

// --- Sequoia ----------------------------------------------------------------

const SEQUOIA: Methodology = {
  id: 'sequoia',
  name: 'Sequoia',
  source: 'Sequoia Capital, "Writing a Business Plan"',
  summary:
    'The template most other frameworks are derived from. Opens on company purpose in a single declarative sentence, insists on "Why now", and keeps financials in the main flow.',
  targetMinutes: 20,
  targetSlides: { min: 10, max: 15 },
  appendixTypes: ['useOfFunds', 'metrics', 'roadmap', 'howItWorks', 'logos'],
  rules: [RULE_ONE_IDEA, RULE_NUMBERS, RULE_CONVERSATION],
  steps: [
    {
      type: 'cover',
      label: 'Company purpose',
      brief: {
        job: 'Define the company in a single declarative sentence.',
        prompts: ['One sentence. Not a mission statement, not a category.'],
        warning: 'The hardest slide to write and the one everything else hangs on.',
      },
    },
    {
      type: 'problem',
      label: 'Problem',
      brief: {
        job: 'Describe the pain of the customer and how it is addressed today.',
        prompts: ['Who has the pain.', 'How the customer addresses it today.', 'What that costs them.'],
      },
    },
    {
      type: 'solution',
      label: 'Solution',
      brief: {
        job: 'Show why your value proposition makes the customer’s life better.',
        prompts: ['Where the product physically sits.', 'Use cases.', 'Why this is better, not just different.'],
      },
    },
    {
      type: 'whyNow',
      label: 'Why now',
      brief: {
        job: 'Set up the historical evolution of your category and why this is possible now.',
        prompts: ['What recent trends make the solution possible.', 'Why the previous attempts failed.'],
        warning: 'The best companies almost always have a compelling why-now.',
      },
    },
    {
      type: 'market',
      label: 'Market size',
      brief: {
        job: 'Identify the customer you serve and the size of that market.',
        prompts: ['Who the customer is.', 'Bottom-up sizing from real buyers and real prices.', 'TAM, SAM, SOM only with a path.'],
        warning: 'Top-down market numbers with no bottom-up path get discounted to zero.',
      },
    },
    {
      type: 'competition',
      label: 'Competition',
      brief: {
        job: 'List competitors and your competitive advantages.',
        prompts: ['Direct and indirect competitors.', 'The advantage that persists.'],
      },
    },
    {
      type: 'product',
      label: 'Product',
      brief: {
        job: 'Product line-up, form factor, functionality, and development roadmap.',
        prompts: ['What it is.', 'How it works.', 'What ships next.'],
      },
    },
    {
      type: 'businessModel',
      label: 'Business model',
      brief: {
        job: 'Revenue model, pricing, average account size, sales and distribution model.',
        prompts: ['Pricing.', 'Average account size and lifetime value.', 'Sales and distribution.', 'Customer pipeline.'],
      },
    },
    {
      type: 'traction',
      label: 'Traction',
      brief: {
        job: 'Show the proof that the model works.',
        prompts: ['Revenue, usage, retention.', 'Named customers.'],
      },
      optional: true,
    },
    {
      type: 'team',
      label: 'Team',
      brief: {
        job: 'Tell the story of the founders and key team members.',
        prompts: ['Founders and management.', 'Board and advisors.', 'Why this team.'],
      },
    },
    {
      type: 'financials',
      label: 'Financials',
      brief: {
        job: 'P&L, balance sheet, cash flow, cap table, and the deal.',
        prompts: ['Profit and loss.', 'Cash flow and burn.', 'The deal you are proposing.'],
      },
    },
    {
      type: 'ask',
      label: 'The deal',
      brief: {
        job: 'How much you are raising and against what.',
        prompts: ['Amount and instrument.', 'Use of proceeds.', 'Milestones this funds.'],
      },
    },
  ],
};

// --- Y Combinator -----------------------------------------------------------

const YC: Methodology = {
  id: 'yc',
  name: 'Y Combinator',
  source: 'Y Combinator seed deck guidance',
  summary:
    'Built for seed. Traction moves to the front because at seed everything else is a claim and traction is the only fact. Ten slides, plain language, no decoration.',
  targetMinutes: 15,
  targetSlides: { min: 10, max: 12 },
  appendixTypes: ['useOfFunds', 'metrics', 'roadmap', 'moat', 'howItWorks', 'logos', 'competition'],
  rules: [
    RULE_ONE_IDEA,
    RULE_NUMBERS,
    { id: 'plain-language', rule: 'Write it so a smart person outside your industry understands it. No jargon, no adjectives doing load-bearing work.' },
  ],
  steps: [
    {
      type: 'cover',
      label: 'Title',
      brief: {
        job: 'Company name and what you do in one line a non-expert understands.',
        prompts: ['Company name.', 'One line. Plain words.'],
      },
    },
    {
      type: 'problem',
      label: 'Problem',
      brief: {
        job: 'State the problem so specifically that it is obviously real.',
        prompts: ['Whose problem.', 'How they deal with it now.'],
      },
    },
    {
      type: 'solution',
      label: 'Solution',
      brief: {
        job: 'What you built, in simple terms.',
        prompts: ['What it does.', 'Why it works.'],
      },
    },
    {
      type: 'traction',
      label: 'Traction',
      brief: {
        job: 'Growth, revenue, usage. The only unarguable slide in a seed deck.',
        prompts: ['The chart, if it is up and to the right.', 'Revenue, users, retention.', 'Growth rate, stated per week or per month.'],
        warning: 'If you have none, say so plainly and move on. Padding it is worse than lacking it.',
      },
    },
    {
      type: 'market',
      label: 'Market',
      brief: {
        job: 'Who the customers are and how many of them there are.',
        prompts: ['Bottom-up: buyers times price.', 'Why this gets bigger.'],
      },
    },
    {
      type: 'product',
      label: 'Product',
      brief: {
        job: 'Show it. Screenshots or a demo beat description.',
        prompts: ['What the user sees.', 'The core workflow.'],
      },
    },
    {
      type: 'businessModel',
      label: 'Business model',
      brief: {
        job: 'How you make money.',
        prompts: ['What you charge.', 'Unit economics if you have them.'],
      },
    },
    {
      type: 'team',
      label: 'Team',
      brief: {
        job: 'Who you are and why you will not quit.',
        prompts: ['Founders, technical background.', 'Why you started this.'],
      },
    },
    {
      type: 'financials',
      label: 'Financials',
      brief: {
        job: 'Current burn, runway, and the shape of the next 18 months.',
        prompts: ['Burn and runway.', 'Simple projection.'],
      },
      optional: true,
    },
    {
      type: 'ask',
      label: 'The ask',
      brief: {
        job: 'How much and what it buys.',
        prompts: ['Amount.', 'What it gets you to.'],
      },
    },
  ],
};

// --- Kawasaki ---------------------------------------------------------------

const KAWASAKI: Methodology = {
  id: 'kawasaki',
  name: 'Kawasaki 10/20/30',
  source: 'Guy Kawasaki, "The Only 10 Slides You Need in Your Pitch"',
  summary:
    'Ten slides, twenty minutes, nothing under thirty-point type. The font rule is the real one: it forces you to cut text until only the argument is left.',
  targetMinutes: 20,
  targetSlides: { min: 10, max: 10 },
  minFontPt: 30,
  appendixTypes: ['logos', 'howItWorks', 'metrics'],
  rules: [
    { id: 'ten-slides', rule: 'Ten slides. A normal person cannot hold more than ten concepts in one meeting, and venture capitalists are very normal.' },
    { id: 'twenty-minutes', rule: 'Twenty minutes of talking, whatever the meeting is booked for. The rest is discussion.' },
    { id: 'thirty-point', rule: 'No font under thirty points. If it will not fit, you do not know your material well enough to say it shorter.' },
  ],
  steps: [
    {
      type: 'cover',
      label: 'Title',
      brief: {
        job: 'Company, your name and title, and how to reach you.',
        prompts: ['Company name.', 'Your name, title, email, phone.'],
      },
    },
    {
      type: 'problem',
      label: 'Problem / opportunity',
      brief: {
        job: 'What pain are you alleviating?',
        prompts: ['The pain.', 'Who feels it.'],
      },
    },
    {
      type: 'solution',
      label: 'Value proposition',
      brief: {
        job: 'The value of solving the problem, not a description of the product.',
        prompts: ['What the customer gets.', 'Stated as value, not features.'],
      },
    },
    {
      type: 'moat',
      label: 'Underlying magic',
      brief: {
        job: 'The technology, secret sauce, or magic behind your product.',
        prompts: ['The thing that is hard to copy.', 'A diagram beats a paragraph here.'],
        warning: 'The one slide where bragging is the job.',
      },
    },
    {
      type: 'businessModel',
      label: 'Business model',
      brief: {
        job: 'How you make money.',
        prompts: ['Who pays.', 'Revenue streams and pricing.'],
      },
    },
    {
      type: 'goToMarket',
      label: 'Go-to-market plan',
      brief: {
        job: 'How you reach customers without spending all the money.',
        prompts: ['Channels.', 'Partnerships.', 'Why this is affordable.'],
      },
    },
    {
      type: 'competition',
      label: 'Competitive analysis',
      brief: {
        job: 'A complete view of the landscape, showing you understand it.',
        prompts: ['Direct and indirect competitors.', 'What you have that they do not.'],
      },
    },
    {
      type: 'team',
      label: 'Management team',
      brief: {
        job: 'The key players, board, and investors.',
        prompts: ['Management.', 'Board and advisors.', 'Major investors.'],
        warning: 'Do not hide the holes. Investors expect them at this stage.',
      },
    },
    {
      type: 'financials',
      label: 'Financial projections and key metrics',
      brief: {
        job: 'A three-year forecast built bottom-up, with the metrics that drive it.',
        prompts: ['Three-year projection.', 'Key metrics: headcount, conversion, units.', 'Bottom-up, never top-down.'],
      },
    },
    {
      type: 'ask',
      label: 'Current status and use of funds',
      brief: {
        job: 'Where you are, what you have done, and what the money does next.',
        prompts: ['Accomplishments to date.', 'Timeline.', 'How much and where it goes.'],
      },
    },
  ],
};

// --- a16z -------------------------------------------------------------------

const A16Z: Methodology = {
  id: 'a16z',
  name: 'a16z',
  source: 'Andreessen Horowitz pitch guidance',
  summary:
    'Problem-first and unit-economics-first. Opens by answering who you are and what you are building, then spends its weight on whether the economics work at scale rather than on growth alone.',
  targetMinutes: 25,
  targetSlides: { min: 12, max: 16 },
  appendixTypes: ['roadmap', 'howItWorks', 'logos'],
  rules: [
    RULE_ONE_IDEA,
    RULE_NUMBERS,
    { id: 'invest-in-problems', rule: 'Investors buy problems, not products. If the problem is not obviously large, no product slide will save it.' },
    { id: 'unit-economics', rule: 'Show you have thought about unit economics, not just growth. A clean believable curve beats a bloated one.' },
  ],
  steps: [
    {
      type: 'cover',
      label: 'Opening',
      brief: {
        job: 'Answer two questions: who are you, and what are you building?',
        prompts: ['Who you are.', 'What you are building.'],
      },
    },
    {
      type: 'problem',
      label: 'Problem',
      brief: {
        job: 'The problem, sized. Investors invest in problems, not products.',
        prompts: ['The problem.', 'How big it is.', 'Who pays for it badly today.'],
      },
    },
    {
      type: 'whyNow',
      label: 'Why now',
      brief: {
        job: 'The market shift that makes this the moment.',
        prompts: ['What changed.', 'Why incumbents cannot respond.'],
      },
    },
    {
      type: 'solution',
      label: 'Solution',
      brief: {
        job: 'What you built and why it is the right shape for that problem.',
        prompts: ['The product.', 'Why this approach.'],
      },
    },
    {
      type: 'product',
      label: 'Product',
      brief: {
        job: 'How it works, in enough depth to be credible.',
        prompts: ['Core workflow.', 'What is live.'],
      },
    },
    {
      type: 'market',
      label: 'Market',
      brief: {
        job: 'The market, sized bottom-up, with the wedge you enter through.',
        prompts: ['Bottom-up sizing.', 'The wedge.', 'The expansion path.'],
      },
    },
    {
      type: 'traction',
      label: 'Traction',
      brief: {
        job: 'A clean, believable growth curve.',
        prompts: ['Growth over time.', 'Retention.', 'Named customers.'],
        warning: 'Clarity matters more than size. A clean curve builds more trust than a bloated one.',
      },
    },
    {
      type: 'businessModel',
      label: 'Business model and unit economics',
      brief: {
        job: 'Prove the economics work at scale, not just that the line goes up.',
        prompts: ['Pricing.', 'Gross margin.', 'CAC, payback, and lifetime value.', 'What breaks at 10x.'],
      },
    },
    {
      type: 'goToMarket',
      label: 'Go to market',
      brief: {
        job: 'The repeatable motion that buys the next thousand customers.',
        prompts: ['Motion.', 'CAC and payback period.', 'Why it scales.'],
      },
    },
    {
      type: 'competition',
      label: 'Competitive landscape',
      brief: {
        job: 'The honest landscape, including the status quo.',
        prompts: ['Alternatives.', 'Your durable advantage.'],
      },
    },
    {
      type: 'moat',
      label: 'Defensibility',
      brief: {
        job: 'What compounds: data, network effects, switching cost, distribution.',
        prompts: ['What gets stronger with scale.', 'Why a funded competitor cannot copy it in a quarter.'],
      },
    },
    {
      type: 'team',
      label: 'Team',
      brief: {
        job: 'Founder-market fit, stated as evidence.',
        prompts: ['Why this team for this problem.', 'What you have already shipped together.'],
      },
    },
    {
      type: 'financials',
      label: 'Financials',
      brief: {
        job: 'The model, its assumptions, and the burn.',
        prompts: ['Projection with assumptions stated.', 'Burn and runway.'],
      },
    },
    {
      type: 'ask',
      label: 'The ask',
      brief: {
        job: 'Amount, milestones, and the shape of the next round.',
        prompts: ['Amount and instrument.', 'Milestones.', 'Next round.'],
      },
    },
  ],
};

export const METHODOLOGIES: Methodology[] = [HOUSE, SEQUOIA, YC, KAWASAKI, A16Z];

export const DEFAULT_METHODOLOGY_ID = HOUSE.id;

export function getMethodology(id: string): Methodology {
  return METHODOLOGIES.find((methodology) => methodology.id === id) ?? HOUSE;
}

export function methodologyIds(): string[] {
  return METHODOLOGIES.map((methodology) => methodology.id);
}

/** The slide types a methodology treats as required. */
export function requiredTypes(methodology: Methodology): SlideType[] {
  return methodology.steps.filter((step) => !step.optional).map((step) => step.type);
}

/** This methodology's label for a slide type, falling back to the type's own. */
export function stepFor(methodology: Methodology, type: SlideType): MethodologyStep | undefined {
  return methodology.steps.find((step) => step.type === type);
}
