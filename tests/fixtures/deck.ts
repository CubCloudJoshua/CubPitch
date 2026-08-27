import { createDeck, type Deck, type Slide } from '@cubpitch/core';

/**
 * A complete, realistic deck used across the render and export tests.
 *
 * Filled in rather than skeletal on purpose: an exporter tested only against
 * empty slides passes while producing empty PowerPoint, and a layout tested
 * only against short strings breaks the first time someone writes a real
 * sentence.
 */
export function sampleDeck(overrides: Partial<Deck> = {}): Deck {
  const slides: Slide[] = [
    {
      id: 's1', type: 'cover', notes: 'Open with the one-liner. Do not read the slide.', hidden: false,
      headline: 'CubCloud',
      oneLiner: 'We help regulated Montana operators run AI on infrastructure they own, so their data never leaves the state.',
      presenter: 'Joshua Cub', date: 'Fall 2026', confidential: true,
    },
    {
      id: 's2', type: 'problem', notes: '', hidden: false,
      title: 'Hospitals pay $40K a month to keep AI off their own patient data',
      who: 'Regional hospital systems in Montana and Wyoming, 200 to 800 beds.',
      today: 'They send de-identified extracts to a coastal cloud, wait 6 weeks for legal review, and shelve half the projects.',
      cost: '$40K/mo in cloud and compliance overhead, plus 6 weeks of legal review per project.',
      worsening: 'State data-residency rules tightened in 2026 and the review queue has doubled.',
      stat: { value: '6 weeks', label: 'Average legal review per AI project', note: 'Across 4 systems we interviewed' },
    },
    {
      id: 's3', type: 'solution', notes: '', hidden: false,
      title: 'The model runs where the data already is',
      lead: 'We take the compliance review off their plate by never moving the data.',
      before: 'Extract, de-identify, ship to a coastal region, wait for legal, rebuild the pipeline.',
      after: 'Point the model at the existing warehouse. Nothing leaves the building.',
      inScope: ['On-premise inference', 'Audit trail per query', 'HIPAA and state residency'],
      outOfScope: ['Model training from scratch', 'Consumer applications'],
    },
    {
      id: 's4', type: 'whyNow', notes: '', hidden: false,
      title: 'Inference got cheap enough to run in a closet',
      shift: 'Open-weight models matched 2024 frontier quality at 1/40th the serving cost, and a single rack now serves a 600-bed hospital.',
      incumbentLag: 'The hyperscalers sell regions, not racks. Their unit of deployment is bigger than the customer.',
      window: 'Once a system signs a 5-year coastal contract, they are gone until 2031.',
      timeline: [
        { label: '2024', title: 'Frontier only', items: [], state: 'done' },
        { label: '2026', title: 'Open weights match it', items: [], state: 'active' },
        { label: '2028', title: 'Contracts lock', items: [], state: 'planned' },
      ],
    },
    {
      id: 's5', type: 'market', notes: '', hidden: false,
      title: '38 hospital systems in the northern Rockies write this check',
      beachhead: { segment: 'Regional hospital systems, 200 to 800 beds, in MT, WY, ID and the Dakotas.', buyerCount: '38 systems', price: '$180K/yr' },
      expansion: [
        { segment: 'Credit unions and regional banks under the same residency rules', note: '210 institutions in the same states' },
        { segment: 'State and tribal government agencies', note: '' },
      ],
      broader: { value: '$4.1B', label: 'US regulated on-premise inference by 2030' },
      source: 'Bottom-up from AHA facility counts; expansion sizing from FDIC call reports',
    },
    {
      id: 's6', type: 'product', notes: '', hidden: false,
      title: 'A rack, an audit log, and a control plane they can show a regulator',
      lead: '',
      workflow: [
        { title: 'Install', body: 'One rack in their existing data room. Two days.' },
        { title: 'Connect', body: 'Read-only against the warehouse they already run.' },
        { title: 'Serve', body: 'Inference with a per-query audit record.' },
        { title: 'Prove', body: 'Export the compliance report their auditor asks for.' },
      ],
      live: ['Inference serving', 'Audit trail', 'Control plane'],
      coming: ['Multi-site federation', 'Fine-tuning on-prem'],
      moat: 'Every query written to their audit log raises the cost of moving to anyone else.',
    },
    {
      id: 's7', type: 'traction', notes: '', hidden: false,
      title: 'Two systems paying, one expanding',
      lead: '',
      evidence: [
        { kind: 'revenue', value: '$31K MRR', label: 'Recurring revenue', customer: 'Bozeman Health' },
        { kind: 'retention', value: '100%', label: 'Logo retention over 14 months' },
        { kind: 'paidPilot', value: '$45K', label: 'Paid pilot, converting Q1', customer: 'Billings Clinic' },
        { kind: 'loi', value: '3', label: 'Signed letters of intent from systems with budget' },
      ],
      chart: {
        kind: 'area',
        series: [{ name: 'MRR', points: [
          { label: 'Q1', value: 4000 }, { label: 'Q2', value: 9000 },
          { label: 'Q3', value: 18000 }, { label: 'Q4', value: 31000 },
        ] }],
        format: 'currency', currency: 'USD', showLegend: false, showValues: false,
        source: 'Internal billing, through August 2026',
      },
    },
    {
      id: 's8', type: 'businessModel', notes: '', hidden: false,
      title: 'They buy the rack once and the control plane every year',
      lead: '',
      streams: [
        { name: 'Platform licence', description: 'Annual, per site, tiered by bed count.', price: '$180K/yr', share: 70 },
        { name: 'Hardware', description: 'Pass-through at 12 points.', price: '$95K once', share: 20 },
        { name: 'Compliance reporting', description: 'Add-on the auditors ask for by name.', price: '$24K/yr', share: 10 },
      ],
      grossMargin: '74%',
      expansion: 'A second site is 60% of the first with no new sales cycle.',
    },
    {
      id: 's9', type: 'goToMarket', notes: '', hidden: false,
      title: 'The compliance officer is the buyer, not the CIO',
      lead: '',
      motion: 'founder-led',
      whoSells: 'Founder-led through the Montana Hospital Association, which every one of the 38 belongs to.',
      primaryChannel: 'The Montana Hospital Association annual meeting and its compliance working group.',
      cac: '$14K',
      cacBasis: 'Two closed deals; both sourced from the same association meeting.',
      steps: [
        { title: 'Association working group', body: 'Present the audit report format, not the product.' },
        { title: 'Compliance officer intro', body: 'They bring the CIO, which reverses the usual order.' },
        { title: 'Paid pilot', body: '90 days, one department.' },
      ],
    },
    {
      id: 's10', type: 'competition', notes: '', hidden: false,
      title: 'Nobody sells a rack to a 400-bed hospital',
      lead: '',
      statusQuo: 'A de-identified extract, a coastal region, and six weeks of legal review. Most projects die here.',
      alternatives: [
        { name: 'AWS / Azure gov regions', whatTheyDo: 'Compliant cloud regions.', whyNotThem: 'Still off-premise. The residency question does not go away, it moves.' },
        { name: 'On-prem GPU vendors', whatTheyDo: 'Sell hardware.', whyNotThem: 'No control plane and no audit story. The hospital still builds it.' },
        { name: 'Health-IT incumbents', whatTheyDo: 'Bundle analytics into the EHR.', whyNotThem: 'Their roadmap is 2029 and their models are their own.' },
      ],
      winningAxis: 'The audit report. We are the only one that hands the compliance officer the document they are graded on.',
      matrix: {
        competitors: ['CubCloud', 'Gov cloud regions', 'GPU vendors', 'Health-IT incumbents'],
        capabilities: ['Data never leaves', 'Audit report', 'Runs in 2 days', 'Under $200K/yr'],
        marks: [
          ['yes', 'yes', 'yes', 'yes'],
          ['no', 'partial', 'partial', 'no'],
          ['yes', 'no', 'no', 'partial'],
          ['partial', 'no', 'no', 'no'],
        ],
        usIndex: 0,
      },
    },
    {
      id: 's11', type: 'team', notes: '', hidden: false,
      title: 'We have already run this stack inside a hospital',
      lead: '',
      people: [
        { name: 'Joshua Cub', role: 'CEO', scar: 'Built and sold the compliance pipeline Bozeman Health still runs.', credentials: ['CubCloud', 'MSU'], },
        { name: 'A. Reyes', role: 'CTO', scar: 'Ran inference infrastructure at 40k QPS for six years.', credentials: [] },
        { name: 'M. Whitefeather', role: 'Head of Compliance', scar: 'Sat on the state working group that wrote the 2026 residency rule.', credentials: [] },
      ],
      missing: 'A enterprise account executive who has sold into hospital systems. This round hires them first.',
      hiredWithRound: true,
      advisors: [],
    },
    {
      id: 's12', type: 'ask', notes: 'Leave this slide up.', hidden: false,
      title: 'Raising $3M to get to 12 paying systems',
      amount: '$3M',
      instrument: 'SAFE, $12M post-money cap',
      lead: '',
      buys: [
        { label: 'Two engineers and one AE', amount: '$1.6M', detail: 'Through month 18' },
        { label: 'Rack inventory for 10 sites', amount: '$0.9M', detail: 'Pass-through, recovered on install' },
        { label: 'Compliance certification', amount: '$0.5M', detail: 'SOC 2 Type II and HITRUST' },
      ],
      outcome: ['12 paying systems', '$2.1M ARR', 'HITRUST certified', 'Second state entered'],
      nextRound: 'A $10M Series A at 12 systems and $2M ARR, led by a healthcare-infrastructure fund.',
    },
  ];

  return {
    ...createDeck({
      title: 'CubCloud Seed 2026',
      company: { name: 'CubCloud', tagline: 'Sovereign AI infrastructure', website: 'cubcloud.ai', location: 'Bozeman, Montana', sector: 'AI infrastructure' },
      meta: { stage: 'seed', raise: '$3M SAFE', footer: 'CubCloud AI · 2026', confidentiality: 'Confidential' },
      slides,
    }),
    ...overrides,
  };
}
