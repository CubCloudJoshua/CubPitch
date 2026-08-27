import { slideId } from './ids.js';
import type { Slide, SlideType } from './slide.js';

/**
 * Starter content for a newly added slide.
 *
 * Placeholders are written as instructions to the author, not lorem ipsum.
 * A slide that says "One sentence. The problem, not the category." gets
 * rewritten; a slide that says "Lorem ipsum" gets presented by accident.
 */
export function emptySlide(type: SlideType): Slide {
  const id = slideId();
  const base = { id, notes: '', hidden: false } as const;

  switch (type) {
    case 'cover':
      return {
        ...base,
        type,
        headline: 'Company',
        oneLiner: 'We help [who] [do what] so they [get this].',
        confidential: true,
      };
    case 'agenda':
      return { ...base, type, title: 'Agenda', items: ['Problem', 'Solution', 'Market', 'Traction', 'The ask'] };
    case 'section':
      return { ...base, type, title: 'Section', subtitle: '', variant: 'section' };
    case 'statement':
      return { ...base, type, text: 'The one sentence you want them repeating in the partner meeting.' };
    case 'problem':
      return {
        ...base,
        type,
        title: 'The problem',
        who: 'Name one customer segment.',
        today: 'What they do about it today, badly.',
        cost: 'What that costs them, with a number.',
        worsening: 'Why it is getting worse.',
      };
    case 'solution':
      return {
        ...base,
        type,
        title: 'What we built',
        lead: 'The job you take off their plate.',
        before: 'How the work goes today.',
        after: 'How it goes with us.',
        inScope: [],
        outOfScope: [],
      };
    case 'whyNow':
      return {
        ...base,
        type,
        title: 'Why now',
        shift: 'What changed in the world.',
        incumbentLag: 'Why incumbents are slow to answer it.',
        window: 'Why this window closes.',
        timeline: [],
      };
    case 'product':
      return {
        ...base,
        type,
        title: 'Product',
        lead: '',
        workflow: [
          { title: 'Step one', body: '' },
          { title: 'Step two', body: '' },
        ],
        live: [],
        coming: [],
        moat: '',
      };
    case 'goToMarket':
      return {
        ...base,
        type,
        title: 'Go to market',
        lead: '',
        motion: 'founder-led',
        whoSells: 'Who sells it.',
        primaryChannel: 'The one channel you starve the others for.',
        cac: '',
        cacBasis: '',
        steps: [],
      };
    case 'howItWorks':
      return {
        ...base,
        type,
        title: 'How it works',
        lead: '',
        steps: [
          { title: 'Input', body: '' },
          { title: 'Processing', body: '' },
          { title: 'Output', body: '' },
        ],
      };
    case 'market':
      return {
        ...base,
        type,
        title: 'Market',
        lead: '',
        beachhead: { segment: 'Who writes a check in the next 12 months.', buyerCount: '', price: '' },
        expansion: [],
      };
    case 'businessModel':
      return {
        ...base,
        type,
        title: 'Business model',
        lead: '',
        streams: [{ name: 'Revenue stream', description: 'Who pays, for what, how often.', price: '' }],
        grossMargin: '',
        expansion: '',
      };
    case 'traction':
      return { ...base, type, title: 'Traction', lead: '', evidence: [] };
    case 'metrics':
      return { ...base, type, title: 'Key metrics', stats: [{ value: '0', label: 'Metric' }] };
    case 'competition':
      return {
        ...base,
        type,
        title: 'Competition',
        lead: '',
        statusQuo: 'What they do instead: spreadsheets, a VA, nothing.',
        alternatives: [
          { name: 'Alternative', whatTheyDo: '', whyNotThem: '' },
          { name: 'Alternative', whatTheyDo: '', whyNotThem: '' },
          { name: 'Alternative', whatTheyDo: '', whyNotThem: '' },
        ],
        winningAxis: 'The one axis you win on.',
      };
    case 'moat':
      return {
        ...base,
        type,
        title: 'Why we win',
        lead: '',
        pillars: [{ title: 'What compounds', body: 'And why a funded competitor cannot copy it in a quarter.' }],
      };
    case 'roadmap':
      return {
        ...base,
        type,
        title: 'Roadmap',
        lead: '',
        phases: [
          { label: 'Now', title: 'Shipping', items: [], state: 'active' },
          { label: 'Next', title: 'Building', items: [], state: 'planned' },
        ],
      };
    case 'financials':
      return {
        ...base,
        type,
        title: 'Financials',
        lead: '',
        assumptions: [],
        table: {
          columns: [
            { label: '', align: 'left' },
            { label: 'Y1', align: 'right' },
            { label: 'Y2', align: 'right' },
            { label: 'Y3', align: 'right' },
          ],
          rows: [
            { cells: ['Revenue', '', '', ''], emphasis: false },
            { cells: ['Gross margin', '', '', ''], emphasis: false },
            { cells: ['Net burn', '', '', ''], emphasis: true },
          ],
        },
      };
    case 'useOfFunds':
      return {
        ...base,
        type,
        title: 'Use of funds',
        lead: '',
        allocations: [
          { label: 'Engineering', percent: 50 },
          { label: 'Go to market', percent: 30 },
          { label: 'Operations', percent: 20 },
        ],
      };
    case 'team':
      return {
        ...base,
        type,
        title: 'Team',
        lead: '',
        people: [{ name: 'Name', role: 'Role', scar: 'The relevant scar, in one line.', credentials: [] }],
        missing: 'Who is missing.',
        hiredWithRound: true,
        advisors: [],
      };
    case 'logos':
      return { ...base, type, title: 'Customers', lead: '', logos: [{ name: 'Customer' }] };
    case 'quote':
      return { ...base, type, text: 'What a customer said when it worked.', author: 'Name', role: 'Title', org: 'Company' };
    case 'ask':
      return {
        ...base,
        type,
        title: 'The ask',
        amount: '$0M',
        instrument: '',
        lead: '',
        buys: [{ label: 'Engineering hires', amount: '$0', detail: '' }],
        outcome: ['What is true 18 months from now.'],
        nextRound: '',
      };
    case 'closing':
      return { ...base, type, headline: 'Thank you', subhead: '', contactName: '', email: '' };
    case 'bullets':
      return { ...base, type, title: 'Title', lead: '', bullets: [{ text: 'Point', emphasis: false }] };
    case 'image':
      return { ...base, type, media: { src: '', alt: '', fit: 'cover' }, caption: '' };
  }
}
