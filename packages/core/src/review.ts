import { evidenceStrength, EVIDENCE_STRENGTH } from './blocks.js';
import type { Deck } from './deck.js';
import {
  getMethodology,
  requiredTypes,
  stepFor,
  type Methodology,
} from './methodology.js';
import { plainText } from './text.js';
import { slideProse, slideTitle, type Slide, type SlideType } from './slide.js';

/**
 * Structural review.
 *
 * These are the checks that hold without a model in the loop: they are about
 * what the deck *contains*, not whether the writing is any good. "You have no
 * why-now slide" and "your use of funds adds up to 87%" are facts. "Your
 * traction is unconvincing" is a judgement and belongs to a later reviewer.
 *
 * Checks come from two places. Slide-level checks are intrinsic: a use of funds
 * that adds to 87% is wrong under every methodology. Deck-level checks are
 * whatever the deck's chosen methodology asks for, which is why a ten-slide
 * Kawasaki deck is not scolded for the length that a Sequoia deck would be.
 *
 * Nothing here blocks a save. A half-written deck at 11pm is a normal state for
 * a deck to be in, and a tool that refuses to hold one is a tool people leave.
 */

/** Speaking pace used to turn a word count into seconds. */
export const WORDS_PER_MINUTE = 130;
/** A slide that runs past this is two slides, or mush. */
export const MAX_SLIDE_SECONDS = 90;

/**
 * DocSend's measured behaviour, used for advice no methodology contradicts:
 * investors average under four minutes on a seed deck, and only 58% reach the
 * final slide. A deck that buries the ask past that point is gambling.
 */
export const DOCSEND_COMPLETION_RATE = 0.58;
export const DOCSEND_SLIDE_BUDGET = 20;

/**
 * Bare topic words that mean the title states a subject rather than a finding.
 * "Market" tells the room nothing they could not guess from the slide's
 * position in the deck.
 */
const TOPIC_TITLES = new Set([
  'agenda',
  'business model',
  'competition',
  'competitive landscape',
  'financials',
  'go to market',
  'go-to-market',
  'gtm',
  'market',
  'market size',
  'metrics',
  'moat',
  'opportunity',
  'our solution',
  'our team',
  'overview',
  'problem',
  'product',
  'roadmap',
  'solution',
  'summary',
  'team',
  'the ask',
  'the problem',
  'the solution',
  'traction',
  'use of funds',
  'vision',
  'why now',
  'why us',
]);

export type ReviewSeverity = 'error' | 'warning' | 'note';

export interface ReviewFinding {
  severity: ReviewSeverity;
  /** Which working rule or framework slide this came from. */
  rule: string;
  /** Slide id, or undefined for a finding about the deck as a whole. */
  slideId?: string;
  message: string;
}

export interface DeckReview {
  findings: ReviewFinding[];
  /** Estimated spoken minutes for the visible deck. */
  minutes: number;
  /** Methodology slides with nothing standing in for them. */
  missing: SlideType[];
  /** The methodology the deck was judged against. */
  methodology: Methodology;
  errors: number;
  warnings: number;
}

const WORDS = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu;
const HAS_DIGIT = /\d/;
/** A capitalised word that is not sentence-initial reads as a name. */
const PROPER_NOUN = /(?:^|[^.!?]\s)([A-Z][a-zA-Z]{2,})/;

function wordCount(strings: string[]): number {
  return strings.reduce((total, value) => total + (plainText(value).match(WORDS)?.length ?? 0), 0);
}

export function slideSeconds(slide: Slide): number {
  return Math.round((wordCount(slideProse(slide)) / WORDS_PER_MINUTE) * 60);
}

export function reviewDeck(deck: Deck): DeckReview {
  const methodology = getMethodology(deck.methodologyId);
  const hasRule = (id: string): boolean => methodology.rules.some((rule) => rule.id === id);
  const findings: ReviewFinding[] = [];
  const visible = deck.slides.filter((slide) => !slide.hidden);
  const present = new Set(visible.map((slide) => slide.type));

  const add = (severity: ReviewSeverity, rule: string, message: string, slideId?: string): void => {
    findings.push(slideId === undefined ? { severity, rule, message } : { severity, rule, message, slideId });
  };

  if (visible.length === 0) {
    return {
      findings: [{ severity: 'error', rule: 'structure', message: 'Deck has no visible slides.' }],
      minutes: 0,
      missing: requiredTypes(methodology),
      methodology,
      errors: 1,
      warnings: 0,
    };
  }

  // --- Methodology coverage -------------------------------------------------

  const missing = requiredTypes(methodology).filter((type) => !present.has(type));
  for (const type of missing) {
    const step = stepFor(methodology, type);
    add(
      'warning',
      `methodology:${type}`,
      `No ${step?.label ?? type} slide. ${methodology.name} leaves its job unanswered: ${step?.brief.job ?? ''}`.trim(),
    );
  }

  const opener = methodology.steps[0]?.type;
  if (opener && visible[0]?.type !== opener) {
    add('warning', `methodology:${opener}`, `${methodology.name} opens on ${stepFor(methodology, opener)?.label ?? opener}. This deck does not.`);
  }

  // Every methodology here ends on the ask, and the house rule is explicit
  // about leaving it up.
  const lastSubstantive = [...visible].reverse().find((slide) => slide.type !== 'closing');
  if (lastSubstantive && lastSubstantive.type !== 'ask' && present.has('ask')) {
    add('note', 'methodology:ask', 'The deck does not end on the ask.');
  }

  // --- Deck length ----------------------------------------------------------

  const { min, max } = methodology.targetSlides;
  if (visible.length < min) {
    add('warning', 'length', `${visible.length} slides. ${methodology.name} works in the ${min} to ${max} range.`);
  } else if (visible.length > max) {
    add('warning', 'length', `${visible.length} slides. ${methodology.name} works in the ${min} to ${max} range; move the rest to an appendix.`);
  }

  if (visible.length > DOCSEND_SLIDE_BUDGET) {
    add(
      'note',
      'attention',
      `Past ${DOCSEND_SLIDE_BUDGET} slides you are relying on attention the data says you do not have: only ${Math.round(
        DOCSEND_COMPLETION_RATE * 100,
      )}% of decks get read to the last page.`,
    );
  }

  // --- Appendix material stays in the appendix ------------------------------

  const appendixTypes = new Set<SlideType>(methodology.appendixTypes);
  const appendixDivider = visible.findIndex((slide) => slide.type === 'section' && slide.variant === 'appendix');
  visible.forEach((slide, index) => {
    if (!appendixTypes.has(slide.type)) return;
    const inMainFlow = appendixDivider === -1 || index < appendixDivider;
    if (inMainFlow) {
      add(
        'note',
        'appendix',
        `${slideTitle(slide)} is appendix material under ${methodology.name}. Move it behind an appendix divider and present it only if asked.`,
        slide.id,
      );
    }
  });

  // --- Spoken length --------------------------------------------------------

  let totalSeconds = 0;
  for (const slide of visible) {
    const seconds = slideSeconds(slide);
    totalSeconds += seconds;
    if (hasRule('ninety-seconds') && seconds > MAX_SLIDE_SECONDS) {
      add(
        'warning',
        'ninety-seconds',
        `About ${seconds}s to read aloud. Over ${MAX_SLIDE_SECONDS}s means this is two slides, or it is mush.`,
        slide.id,
      );
    }
  }
  const minutes = Math.round((totalSeconds / 60) * 10) / 10;
  if (minutes > methodology.targetMinutes) {
    add('warning', 'length', `The deck reads at about ${minutes} minutes. ${methodology.name} budgets ${methodology.targetMinutes}.`);
  }

  // --- Rule: title the slide with the conclusion ----------------------------

  if (hasRule('conclusion-title')) {
    // Reported once for the deck rather than once per slide. The same sentence
    // eleven times is noise an author scrolls past, and a starter deck begins
    // with every slide titled by its step, so the tool would otherwise open by
    // telling you off for titles it wrote itself.
    const placeholders: number[] = [];
    const authored: string[] = [];

    visible.forEach((slide, index) => {
      if (!('title' in slide) || typeof slide.title !== 'string') return;
      const title = plainText(slide.title).trim();
      if (!TOPIC_TITLES.has(title.toLowerCase().replace(/[.:]$/, ''))) return;
      if (title === stepFor(methodology, slide.type)?.label) placeholders.push(index + 1);
      else authored.push(`${index + 1}. "${title}"`);
    });

    if (placeholders.length > 0) {
      add(
        'note',
        'conclusion-title',
        `${placeholders.length} slide${placeholders.length === 1 ? '' : 's'} still carry the placeholder title ` +
          `${methodology.name} gave them (${placeholders.join(', ')}). Replace each with the conclusion that slide reaches.`,
      );
    }
    if (authored.length > 0) {
      add(
        'warning',
        'conclusion-title',
        `Titled with the topic rather than the finding: ${authored.join(', ')}. ` +
          `"Gyms already pay $400/mo to stop churn" beats "Market".`,
      );
    }
  }

  // --- Rule: numbers beat adjectives, names beat categories -----------------

  if (hasRule('numbers-over-adjectives')) {
    for (const slide of visible) {
      if (slide.type === 'cover' || slide.type === 'section' || slide.type === 'closing' || slide.type === 'image') continue;
      const prose = slideProse(slide).join(' ');
      if (!HAS_DIGIT.test(prose) && !PROPER_NOUN.test(prose)) {
        add('note', 'numbers-over-adjectives', 'No number and no name anywhere on this slide. Cut it, or give it proof.', slide.id);
      }
    }
  }

  // --- Rule: plain language (Y Combinator) ----------------------------------

  if (hasRule('plain-language')) {
    for (const slide of visible) {
      const jargon = findJargon(slideProse(slide).join(' '));
      if (jargon.length > 0) {
        add(
          'note',
          'plain-language',
          `Jargon doing load-bearing work: ${jargon.join(', ')}. Write it so a smart outsider understands it.`,
          slide.id,
        );
      }
    }
  }

  // --- Empty slides ---------------------------------------------------------

  // The schema lets a slide be empty so the editor can hold one mid-edit.
  // Saying so is this function's job.
  for (const slide of visible) {
    if (slideProse(slide).every((value) => plainText(value).trim() === '')) {
      add('warning', 'structure', 'This slide has no content on it.', slide.id);
    }
  }

  // --- Per-slide checks -----------------------------------------------------

  for (const slide of visible) findings.push(...reviewSlide(slide));

  const errors = findings.filter((finding) => finding.severity === 'error').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  return { findings, minutes, missing, methodology, errors, warnings };
}

/**
 * Words that sound like substance and carry none. The list is short and
 * specific on purpose: a long banned-word list turns into a thesaurus exercise
 * and people start writing around it rather than writing plainly.
 */
const JARGON = [
  'best-in-class',
  'cutting-edge',
  'disruptive',
  'end-to-end',
  'frictionless',
  'game-changing',
  'holistic',
  'next-generation',
  'paradigm',
  'revolutionary',
  'seamless',
  'synergy',
  'turnkey',
  'world-class',
];

function findJargon(prose: string): string[] {
  const lower = prose.toLowerCase();
  return JARGON.filter((word) => lower.includes(word));
}

function reviewSlide(slide: Slide): ReviewFinding[] {
  const out: ReviewFinding[] = [];
  const flag = (severity: ReviewSeverity, rule: string, message: string): void => {
    out.push({ severity, rule, slideId: slide.id, message });
  };

  switch (slide.type) {
    case 'cover': {
      const line = plainText(slide.oneLiner).trim();
      if (!line) {
        flag('error', 'framework:cover', 'No one-liner. Write it before anything else, or the rest of the deck wanders.');
      } else {
        const words = line.match(WORDS)?.length ?? 0;
        if (words < 6) {
          flag('warning', 'framework:cover', `"${line}" is ${words} words. That is a slogan, not a sentence a stranger can repeat.`);
        }
        if (words > 32) {
          flag('warning', 'framework:cover', 'The one-liner runs long. If it needs a comma splice, it is two ideas.');
        }
      }
      break;
    }

    case 'problem': {
      const who = plainText(slide.who).toLowerCase();
      if (!who) flag('warning', 'framework:problem', 'Nobody named. Who hurts?');
      else if (/\b(everyone|everybody|all businesses|any company|anyone)\b/.test(who)) {
        flag('warning', 'framework:problem', '"Everyone" is not a customer. Name one.');
      }
      if (!plainText(slide.cost).trim()) {
        flag('warning', 'framework:problem', 'The pain has no price. What does it cost them in time, money, or risk?');
      } else if (!HAS_DIGIT.test(plainText(slide.cost))) {
        flag('note', 'numbers-over-adjectives', 'The cost of the problem has no number in it.');
      }
      if (!plainText(slide.worsening).trim()) {
        flag('note', 'framework:problem', 'Nothing says why this is getting worse.');
      }
      break;
    }

    case 'solution':
      if (!plainText(slide.before).trim() || !plainText(slide.after).trim()) {
        flag('note', 'framework:solution', 'No before and after. One workflow, shown changing, beats a feature list.');
      }
      if (slide.outOfScope.length === 0) {
        flag('note', 'framework:solution', 'Nothing is out of scope. Saying what you do not do is what makes the scope credible.');
      }
      break;

    case 'whyNow':
      if (!plainText(slide.shift).trim()) {
        flag('warning', 'framework:whyNow', 'No shift named. What changed in the world that makes this possible now?');
      }
      if (!plainText(slide.window).trim()) {
        flag('note', 'framework:whyNow', 'Nothing says why the window closes.');
      }
      break;

    case 'market': {
      if (!slide.beachhead) {
        flag('warning', 'framework:market', 'No beachhead. Start with who writes a check in the next 12 months, not with a market size.');
      } else {
        if (!slide.beachhead.buyerCount.trim()) flag('note', 'framework:market', 'The beachhead has no buyer count.');
        if (!slide.beachhead.price.trim()) flag('note', 'framework:market', 'The beachhead has no price. What does one of them pay?');
      }
      if (slide.broader && !slide.beachhead) {
        flag('warning', 'framework:market', 'A big market number with no path to it is TAM theater.');
      }
      if (slide.broader && !slide.source) {
        flag('warning', 'framework:market', 'The market number has no source. That is the first question in the room.');
      }
      break;
    }

    case 'product':
      if (slide.workflow.length === 0) {
        flag('warning', 'framework:product', 'No workflow. A sharp person needs to see how it works to believe you can build it.');
      }
      if (slide.live.length === 0 && slide.coming.length > 0) {
        flag('warning', 'framework:product', 'Everything is "coming" and nothing is live. Say so plainly rather than blurring the line.');
      }
      break;

    case 'traction': {
      if (slide.evidence.length === 0) {
        flag('warning', 'framework:traction', 'No evidence. If the round is early, say so and make the rest of the deck sharper, not longer.');
        break;
      }
      const strongest = Math.max(...slide.evidence.map(evidenceStrength));
      if (strongest < EVIDENCE_STRENGTH.paidPilot) {
        flag(
          'warning',
          'framework:traction',
          'The strongest proof here is weaker than a paid pilot. Logos without money are weak and "in talks" is weaker.',
        );
      }
      if (slide.evidence.some((item) => item.kind === 'talks')) {
        flag('note', 'framework:traction', '"In talks" is the weakest claim on the slide. Cut it or convert it.');
      }
      if (slide.evidence.some((item) => !item.customer && (item.kind === 'logo' || item.kind === 'loi' || item.kind === 'paidPilot'))) {
        flag('note', 'numbers-over-adjectives', 'Some evidence has no customer named. Names beat categories.');
      }
      break;
    }

    case 'businessModel':
      if (slide.streams.length === 0) flag('warning', 'framework:businessModel', 'No revenue stream. How do you take money?');
      if (!slide.grossMargin.trim()) flag('warning', 'framework:businessModel', 'No gross margin. Rough is fine; absent is not.');
      if (!plainText(slide.expansion).trim()) {
        flag('note', 'framework:businessModel', 'Nothing says what expands the account after they buy.');
      }
      break;

    case 'goToMarket': {
      if (!plainText(slide.primaryChannel).trim()) {
        flag('warning', 'framework:goToMarket', 'No primary channel. Name the one you will starve the others for.');
      }
      const motion = `${plainText(slide.primaryChannel)} ${plainText(slide.lead)}`.toLowerCase();
      if (/content/.test(motion) && /linkedin/.test(motion)) {
        flag('warning', 'framework:goToMarket', '"Content and LinkedIn" is not a motion. Say who sells and how they reach the first 100.');
      }
      if (!slide.cac.trim() && !plainText(slide.cacBasis).trim()) {
        flag('note', 'framework:goToMarket', 'No CAC and no plan to learn it with this round.');
      }
      break;
    }

    case 'competition': {
      const text = `${plainText(slide.lead)} ${plainText(slide.statusQuo)}`.toLowerCase();
      if (/\bno (real )?competition\b|\bno competitors\b/.test(text)) {
        flag('error', 'framework:competition', 'Never "we have no competition". The status quo is a competitor.');
      }
      if (!plainText(slide.statusQuo).trim()) {
        flag('warning', 'framework:competition', 'The status quo is missing: spreadsheets, a VA, doing nothing. It is the competitor most decks omit.');
      }
      if (slide.alternatives.length < 3) {
        flag('warning', 'framework:competition', `${slide.alternatives.length} alternatives listed. The framework asks for three to five real ones.`);
      }
      if (!plainText(slide.winningAxis).trim()) {
        flag('warning', 'framework:competition', 'No axis named. What do you actually win on?');
      }
      if (slide.quadrant) {
        const us = slide.quadrant.points.filter((point) => point.us);
        const topRight = slide.quadrant.points.filter((point) => point.x > 0.6 && point.y > 0.6);
        // Membership, not count: a chart with one competitor up there and us
        // elsewhere has the same two totals and is not the thing being warned
        // about.
        const aloneUpThere = topRight.length > 0 && topRight.every((point) => point.us);
        if (us.length > 0 && aloneUpThere) {
          flag('note', 'framework:competition', 'You are alone in the top right. Only ship that if it is true and obvious.');
        }
      }
      break;
    }

    case 'team': {
      if (slide.people.length < 3) {
        flag(
          'note',
          'framework:team',
          `${slide.people.length} ${slide.people.length === 1 ? 'person' : 'people'} shown. Three to five is the working range.`,
        );
      }
      if (slide.people.length > 5) {
        flag('warning', 'framework:team', `${slide.people.length} people is a resume dump. Three to five, one line each.`);
      }
      const scarless = slide.people.filter((person) => !plainText(person.scar).trim());
      if (scarless.length > 0) {
        flag('warning', 'framework:team', `${scarless.length} of ${slide.people.length} have no relevant scar. A title is not a reason.`);
      }
      if (!plainText(slide.missing).trim()) {
        flag('note', 'framework:team', 'Nothing says who is missing. Naming the gap reads as judgement, not weakness.');
      }
      break;
    }

    case 'ask': {
      if (!HAS_DIGIT.test(slide.amount)) flag('error', 'framework:ask', 'The ask has no number in it.');
      if (slide.buys.length === 0) {
        flag('warning', 'framework:ask', 'Nothing says what the money buys.');
      } else {
        const vague = slide.buys.filter((use) => !HAS_DIGIT.test(use.amount));
        if (vague.length > 0) {
          flag('warning', 'framework:ask', `${vague.length} use of funds line${vague.length === 1 ? ' has' : 's have'} no dollar figure. Dollars, not vibes.`);
        }
      }
      if (slide.outcome.length === 0) {
        flag('warning', 'framework:ask', 'Nothing says what is true 18 months later.');
      }
      if (!plainText(slide.nextRound).trim()) {
        flag('note', 'framework:ask', 'Nothing says what the next round looks like if this one works.');
      }
      break;
    }

    case 'useOfFunds': {
      const total = slide.allocations.reduce((sum, item) => sum + item.percent, 0);
      // Authors round; 100.4 is fine, 87 means a line is missing.
      if (Math.abs(total - 100) > 1) {
        flag('error', 'structure', `Use of funds adds up to ${Math.round(total)}%, not 100%.`);
      }
      break;
    }

    case 'image':
      if (!slide.media.src) flag('error', 'structure', 'Image slide has no image.');
      break;

    case 'financials':
      if (slide.table && slide.assumptions.length === 0) {
        flag('note', 'structure', 'A projection with no stated assumptions invites the room to invent its own.');
      }
      break;

    default:
      break;
  }

  return out;
}
