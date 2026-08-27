import { describe, expect, it } from 'vitest';
import {
  createDeck,
  emptySlide,
  getMethodology,
  METHODOLOGIES,
  reviewDeck,
  slideSeconds,
  starterDeck,
  type Deck,
  type Slide,
} from '@cubpitch/core';

const company = { name: 'CubCloud', tagline: 'Sovereign AI infrastructure' };

function deckOf(slides: Slide[], methodologyId = 'house'): Deck {
  return createDeck({ title: 'Test', company, methodologyId, slides });
}

function rules(deck: Deck): string[] {
  return reviewDeck(deck).findings.map((finding) => finding.rule);
}

function messages(deck: Deck): string {
  return reviewDeck(deck).findings.map((finding) => finding.message).join(' | ');
}

describe('methodology registry', () => {
  it('every methodology is internally consistent', () => {
    for (const methodology of METHODOLOGIES) {
      expect(methodology.steps.length).toBeGreaterThan(0);
      expect(methodology.targetSlides.min).toBeLessThanOrEqual(methodology.targetSlides.max);
      // A step whose type has no default would crash the starter deck.
      for (const step of methodology.steps) {
        expect(() => emptySlide(step.type)).not.toThrow();
      }
    }
  });

  it('starts a deck in the methodology order, not a fixed one', () => {
    // Y Combinator puts traction fourth; Sequoia puts why-now there. A tool
    // that ignores this is arguing with the user's chosen framework.
    const yc = starterDeck({ title: 'YC', company, methodologyId: 'yc' });
    const sequoia = starterDeck({ title: 'Sequoia', company, methodologyId: 'sequoia' });

    expect(yc.slides[3]!.type).toBe('traction');
    expect(sequoia.slides[3]!.type).toBe('whyNow');
  });

  it('titles starter slides with the methodology own language', () => {
    const kawasaki = starterDeck({ title: 'K', company, methodologyId: 'kawasaki' });
    const moat = kawasaki.slides.find((slide) => slide.type === 'moat');
    expect(moat && 'title' in moat && moat.title).toBe('Underlying magic');
  });

  it('falls back to the house methodology for an unknown id', () => {
    expect(getMethodology('nonsense').id).toBe('house');
  });
});

describe('review judges against the deck own methodology', () => {
  it('does not scold a ten-slide Kawasaki deck for its length', () => {
    const kawasaki = starterDeck({ title: 'K', company, methodologyId: 'kawasaki' });
    // Kawasaki says ten and means ten, so the starter deck ships exactly ten
    // and the review has nothing to say about its length.
    expect(kawasaki.slides).toHaveLength(10);
    expect(reviewDeck(kawasaki).findings.filter((finding) => finding.rule === 'length')).toHaveLength(0);

    // A methodology with room keeps the closing courtesy slide.
    const house = starterDeck({ title: 'H', company, methodologyId: 'house' });
    expect(house.slides.at(-1)!.type).toBe('closing');
  });

  it('reports what each methodology considers missing', () => {
    const bare = deckOf([emptySlide('cover')], 'sequoia');
    const review = reviewDeck(bare);
    expect(review.missing).toContain('whyNow');
    expect(review.missing).toContain('financials');
    expect(review.methodology.id).toBe('sequoia');
  });

  it('only applies the plain-language rule where the methodology asks for it', () => {
    const slide = emptySlide('solution');
    if (slide.type !== 'solution') throw new Error('wrong type');
    slide.lead = 'A seamless, best-in-class, end-to-end platform.';

    expect(rules(deckOf([emptySlide('cover'), slide], 'yc'))).toContain('plain-language');
    expect(rules(deckOf([emptySlide('cover'), slide], 'sequoia'))).not.toContain('plain-language');
  });
});

describe('working rules', () => {
  it('flags a topic title where the methodology wants a conclusion', () => {
    const slide = emptySlide('market');
    if (slide.type !== 'market') throw new Error('wrong type');
    slide.title = 'Market';
    expect(rules(deckOf([slide]))).toContain('conclusion-title');

    slide.title = 'Gyms already pay $400/mo to stop churn';
    expect(rules(deckOf([slide]))).not.toContain('conclusion-title');
  });

  it('estimates speaking time from the words actually on the slide', () => {
    const short = emptySlide('statement');
    if (short.type !== 'statement') throw new Error('wrong type');
    short.text = 'One sentence.';
    expect(slideSeconds(short)).toBeLessThan(5);

    const long = emptySlide('statement');
    if (long.type !== 'statement') throw new Error('wrong type');
    long.text = Array.from({ length: 400 }, () => 'word').join(' ');
    // 400 words at 130wpm is over three minutes: two slides, or mush.
    expect(slideSeconds(long)).toBeGreaterThan(90);
    expect(rules(deckOf([long]))).toContain('ninety-seconds');
  });
});

describe('per-slide checks', () => {
  it('rejects "we have no competition" outright', () => {
    const slide = emptySlide('competition');
    if (slide.type !== 'competition') throw new Error('wrong type');
    slide.lead = 'We have no competition in this space.';
    const review = reviewDeck(deckOf([slide]));
    expect(review.findings.some((f) => f.severity === 'error' && /no competition/i.test(f.message))).toBe(true);
  });

  it('catches a use of funds that does not add up', () => {
    const slide = emptySlide('useOfFunds');
    if (slide.type !== 'useOfFunds') throw new Error('wrong type');
    slide.allocations = [
      { label: 'Engineering', percent: 50 },
      { label: 'Sales', percent: 20 },
    ];
    expect(messages(deckOf([slide]))).toMatch(/adds up to 70%/);

    // Authors round. 100.4 is fine.
    slide.allocations = [
      { label: 'Engineering', percent: 50.2 },
      { label: 'Sales', percent: 30.1 },
      { label: 'Ops', percent: 20.1 },
    ];
    expect(messages(deckOf([slide]))).not.toMatch(/adds up to/);
  });

  it('ranks traction evidence and warns when the best of it is weak', () => {
    const slide = emptySlide('traction');
    if (slide.type !== 'traction') throw new Error('wrong type');
    slide.evidence = [
      { kind: 'logo', value: '4 logos', label: 'Pilots' },
      { kind: 'talks', value: '12', label: 'In conversation' },
    ];
    const weak = messages(deckOf([slide]));
    expect(weak).toMatch(/weaker than a paid pilot/);
    expect(weak).toMatch(/"In talks" is the weakest/);

    slide.evidence = [{ kind: 'revenue', value: '$41K MRR', label: 'Recurring revenue', customer: 'Bozeman Health' }];
    expect(messages(deckOf([slide]))).not.toMatch(/weaker than a paid pilot/);
  });

  it('calls a big market number with no beachhead what it is', () => {
    const slide = emptySlide('market');
    if (slide.type !== 'market') throw new Error('wrong type');
    delete (slide as { beachhead?: unknown }).beachhead;
    slide.broader = { value: '$4.1B', label: 'Global market' };
    expect(messages(deckOf([slide]))).toMatch(/TAM theater/);
  });

  it('requires the ask to be denominated in dollars', () => {
    const slide = emptySlide('ask');
    if (slide.type !== 'ask') throw new Error('wrong type');
    slide.amount = '$3M';
    slide.buys = [{ label: 'Engineering', amount: 'a lot', detail: '' }];
    expect(messages(deckOf([slide]))).toMatch(/no dollar figure/);

    slide.buys = [{ label: 'Engineering', amount: '$1.8M', detail: '' }];
    expect(messages(deckOf([slide]))).not.toMatch(/no dollar figure/);
  });

  it('rejects "everyone" as a customer', () => {
    const slide = emptySlide('problem');
    if (slide.type !== 'problem') throw new Error('wrong type');
    slide.who = 'Everyone who runs a business';
    expect(messages(deckOf([slide]))).toMatch(/not a customer/);
  });

  it('never blocks: a half-written deck reviews without throwing', () => {
    const deck = starterDeck({ title: 'Half done', company });
    expect(() => reviewDeck(deck)).not.toThrow();
    expect(reviewDeck(deck).findings.length).toBeGreaterThan(0);
  });
});
