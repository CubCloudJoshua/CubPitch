import {
  EVIDENCE_LABELS,
  getMethodology,
  MOTION_LABELS,
  SLIDE_LABELS,
  stepFor,
  type Deck,
  type EvidenceKind,
  type GoToMarketMotion,
  type LogoItem,
  type Slide,
  type SlideOf,
} from '@cubpitch/core';
import type { ReactNode } from 'react';
import { Choice, ObjectList, Para, StringList, Text, Toggle } from './fields.js';
import { ChartField } from './ChartField.js';
import { MediaField } from './MediaField.js';
import { Rewrite } from './Rewrite.js';

/**
 * The inspector.
 *
 * Two things happen here that a generic slide editor cannot do. The fields are
 * the slide's actual fields, named after the job they do, so an author fills in
 * "what it costs them" rather than "bullet 3". And the methodology's brief for
 * that slide sits directly above them, because guidance in a document gets read
 * once and guidance beside the field gets applied every time.
 */

type Patch = (patch: Record<string, unknown>) => void;

export function Inspector({ deck, slide, onChange }: { deck: Deck; slide: Slide; onChange: Patch }): ReactNode {
  const methodology = getMethodology(deck.methodologyId);
  const step = stepFor(methodology, slide.type);

  return (
    <div className="inspector">
      {step ? (
        <div className="brief">
          <p className="label">
            {step.label} · {methodology.name}
          </p>
          <p className="brief__job">{step.brief.job}</p>
          {step.brief.prompts.length > 0 ? (
            <ul className="brief__list">
              {step.brief.prompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          ) : null}
          {step.brief.test ? <p className="brief__test">Test: {step.brief.test}</p> : null}
          {step.brief.warning ? <p className="brief__warning">{step.brief.warning}</p> : null}
        </div>
      ) : (
        <p className="label" style={{ marginBottom: 16 }}>
          {SLIDE_LABELS[slide.type]}
        </p>
      )}

      <SlideFields slide={slide} onChange={onChange} />

      <div className="section">
        <Rewrite deckId={deck.id} slide={slide} onAccept={onChange} />
      </div>

      <div className="section">
        <Para
          label="Speaker notes"
          value={slide.notes}
          rows={4}
          onChange={(notes) => onChange({ notes })}
          hint="Exported to the PowerPoint notes pane. Never rendered on the slide."
        />
        <Toggle label="Hidden from the deck" value={slide.hidden} onChange={(hidden) => onChange({ hidden })} />
      </div>
    </div>
  );
}

const MARKUP_HINT = 'Use **bold** and *italic*.';

function SlideFields({ slide, onChange }: { slide: Slide; onChange: Patch }): ReactNode {
  switch (slide.type) {
    case 'cover':
      return <CoverFields slide={slide} onChange={onChange} />;
    case 'problem':
      return <ProblemFields slide={slide} onChange={onChange} />;
    case 'solution':
      return <SolutionFields slide={slide} onChange={onChange} />;
    case 'whyNow':
      return <WhyNowFields slide={slide} onChange={onChange} />;
    case 'market':
      return <MarketFields slide={slide} onChange={onChange} />;
    case 'product':
      return <ProductFields slide={slide} onChange={onChange} />;
    case 'traction':
      return <TractionFields slide={slide} onChange={onChange} />;
    case 'businessModel':
      return <BusinessModelFields slide={slide} onChange={onChange} />;
    case 'goToMarket':
      return <GoToMarketFields slide={slide} onChange={onChange} />;
    case 'competition':
      return <CompetitionFields slide={slide} onChange={onChange} />;
    case 'team':
      return <TeamFields slide={slide} onChange={onChange} />;
    case 'ask':
      return <AskFields slide={slide} onChange={onChange} />;
    case 'image':
      return <ImageFields slide={slide} onChange={onChange} />;
    case 'quote':
      return <QuoteFields slide={slide} onChange={onChange} />;
    case 'logos':
      return <LogosFields slide={slide} onChange={onChange} />;
    case 'financials':
      return <FinancialsFields slide={slide} onChange={onChange} />;
    default:
      return <GenericFields slide={slide} onChange={onChange} />;
  }
}

// --- Media-bearing supporting slides ----------------------------------------

function ImageFields({ slide, onChange }: { slide: SlideOf<'image'>; onChange: Patch }): ReactNode {
  return (
    <>
      <MediaField label="Image" value={slide.media} kind="full" onChange={(media) => onChange({ media: media ?? { src: '', alt: '', fit: 'cover' } })} />
      <Text label="Title" value={slide.title ?? ''} onChange={(title) => onChange({ title })} />
      <Text label="Caption" value={slide.caption ?? ''} onChange={(caption) => onChange({ caption })} />
    </>
  );
}

function QuoteFields({ slide, onChange }: { slide: SlideOf<'quote'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Quote" value={slide.text} rows={3} onChange={(text) => onChange({ text })} hint={MARKUP_HINT} />
      <Text label="Author" value={slide.author} onChange={(author) => onChange({ author })} />
      <Text label="Role" value={slide.role ?? ''} onChange={(role) => onChange({ role })} />
      <Text label="Company" value={slide.org ?? ''} onChange={(org) => onChange({ org })} />
      <MediaField label="Photo" value={slide.photo} kind="photo" onChange={(photo) => onChange({ photo })} />
    </>
  );
}

function LogosFields({ slide, onChange }: { slide: SlideOf<'logos'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <Para label="Lead" value={slide.lead} onChange={(lead) => onChange({ lead })} />
      <ObjectList
        label="Logos"
        items={slide.logos}
        onChange={(logos) => onChange({ logos })}
        create={(): LogoItem => ({ name: '' })}
        title={(logo, index) => logo.name || `Logo ${index + 1}`}
        addLabel="logo"
      >
        {(logo, update) => (
          <>
            <Text label="Name" value={logo.name} onChange={(name) => update({ name })} />
            <MediaField label="Logo image" value={logo.image} kind="logo" onChange={(image) => update({ image })} />
            <Text label="Note" value={logo.note ?? ''} onChange={(note) => update({ note })} />
          </>
        )}
      </ObjectList>
    </>
  );
}

function FinancialsFields({ slide, onChange }: { slide: SlideOf<'financials'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <Para label="Lead" value={slide.lead} onChange={(lead) => onChange({ lead })} />
      <ChartField label="Chart" value={slide.chart} onChange={(chart) => onChange({ chart })} />
      <StringList
        label="Assumptions"
        values={slide.assumptions}
        onChange={(assumptions) => onChange({ assumptions })}
        addLabel="assumption"
      />
      <p className="field__hint">
        The projection table is edited in the deck JSON for now. A projection with no stated assumptions invites the room
        to invent its own.
      </p>
    </>
  );
}

// --- The twelve -------------------------------------------------------------

function CoverFields({ slide, onChange }: { slide: SlideOf<'cover'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Text label="Company" value={slide.headline} onChange={(headline) => onChange({ headline })} />
      <Para
        label="One-liner"
        value={slide.oneLiner}
        rows={3}
        placeholder="We help [who] [do what] so they [get this]."
        onChange={(oneLiner) => onChange({ oneLiner })}
        hint="Write this before anything else. A sentence a stranger can repeat, not a slogan."
      />
      <Text label="Presenter" value={slide.presenter ?? ''} onChange={(presenter) => onChange({ presenter })} />
      <Text label="Date" value={slide.date ?? ''} onChange={(date) => onChange({ date })} />
      <Toggle label="Confidentiality notice" value={slide.confidential} onChange={(confidential) => onChange({ confidential })} />
      <MediaField label="Logo" value={slide.logo} kind="logo" onChange={(logo) => onChange({ logo })} />
      <MediaField
        label="Background"
        value={slide.background}
        kind="full"
        onChange={(background) => onChange({ background })}
        hint="Dimmed behind the title. Optional."
      />
    </>
  );
}

function ProblemFields({ slide, onChange }: { slide: SlideOf<'problem'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} hint="State the conclusion, not the topic." />
      <Para label="Who hurts" value={slide.who} onChange={(who) => onChange({ who })} hint="One customer. Not everyone." />
      <Para label="What they do today" value={slide.today} onChange={(today) => onChange({ today })} />
      <Para
        label="What it costs them"
        value={slide.cost}
        onChange={(cost) => onChange({ cost })}
        hint="Time, money, or risk. Put a number on it."
      />
      <Para label="Why it is getting worse" value={slide.worsening} onChange={(worsening) => onChange({ worsening })} />
      <div className="section">
        <p className="label" style={{ marginBottom: 10 }}>
          Headline stat (optional)
        </p>
        <Text
          label="Value"
          value={slide.stat?.value ?? ''}
          onChange={(value) => onChange({ stat: { ...(slide.stat ?? { label: '' }), value } })}
        />
        <Text
          label="Label"
          value={slide.stat?.label ?? ''}
          onChange={(label) => onChange({ stat: { ...(slide.stat ?? { value: '' }), label } })}
        />
      </div>
      <MediaField label="Image (instead of the stat)" value={slide.media} onChange={(media) => onChange({ media })} />
    </>
  );
}

function SolutionFields({ slide, onChange }: { slide: SlideOf<'solution'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <Para label="The job you take off their plate" value={slide.lead} onChange={(lead) => onChange({ lead })} hint={MARKUP_HINT} />
      <Para label="Before" value={slide.before} onChange={(before) => onChange({ before })} />
      <Para label="After" value={slide.after} onChange={(after) => onChange({ after })} />
      <StringList label="In scope" values={slide.inScope} onChange={(inScope) => onChange({ inScope })} addLabel="in-scope item" />
      <StringList
        label="Out of scope"
        values={slide.outOfScope}
        onChange={(outOfScope) => onChange({ outOfScope })}
        addLabel="out-of-scope item"
      />
      <MediaField label="Product image" value={slide.media} onChange={(media) => onChange({ media })} />
    </>
  );
}

function WhyNowFields({ slide, onChange }: { slide: SlideOf<'whyNow'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <Para
        label="The shift"
        value={slide.shift}
        onChange={(shift) => onChange({ shift })}
        hint="Cost of compute, buyer behaviour, regulation, a tool that just got cheap."
      />
      <Para label="Why incumbents are slow" value={slide.incumbentLag} onChange={(incumbentLag) => onChange({ incumbentLag })} />
      <Para label="Why the window closes" value={slide.window} onChange={(window) => onChange({ window })} />
      <ObjectList
        label="Timeline (optional)"
        items={slide.timeline}
        onChange={(timeline) => onChange({ timeline })}
        create={() => ({ label: '', title: '', items: [], state: 'planned' as const })}
        title={(phase, index) => phase.label || `Phase ${index + 1}`}
        addLabel="phase"
      >
        {(phase, update) => (
          <>
            <Text label="When" value={phase.label} onChange={(label) => update({ label })} />
            <Text label="What" value={phase.title} onChange={(title) => update({ title })} />
          </>
        )}
      </ObjectList>
    </>
  );
}

function MarketFields({ slide, onChange }: { slide: SlideOf<'market'>; onChange: Patch }): ReactNode {
  const beachhead = slide.beachhead ?? { segment: '', buyerCount: '', price: '' };
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <div className="section">
        <p className="label" style={{ marginBottom: 10 }}>
          Beachhead: who writes a check in 12 months
        </p>
        <Para label="Segment" value={beachhead.segment} onChange={(segment) => onChange({ beachhead: { ...beachhead, segment } })} />
        <Text
          label="How many buyers"
          value={beachhead.buyerCount}
          onChange={(buyerCount) => onChange({ beachhead: { ...beachhead, buyerCount } })}
        />
        <Text label="What each pays" value={beachhead.price} onChange={(price) => onChange({ beachhead: { ...beachhead, price } })} />
      </div>
      <ObjectList
        label="Then: adjacent buyers"
        items={slide.expansion}
        onChange={(expansion) => onChange({ expansion })}
        create={() => ({ segment: '', note: '' })}
        title={(item, index) => item.segment || `Segment ${index + 1}`}
        addLabel="segment"
      >
        {(item, update) => (
          <>
            <Text label="Segment" value={item.segment} onChange={(segment) => update({ segment })} />
            <Text label="Note" value={item.note} onChange={(note) => update({ note })} />
          </>
        )}
      </ObjectList>
      <div className="section">
        <p className="label" style={{ marginBottom: 10 }}>
          The big number (only with an honest path to it)
        </p>
        <Text
          label="Value"
          value={slide.broader?.value ?? ''}
          onChange={(value) => onChange({ broader: value ? { value, label: slide.broader?.label ?? '' } : undefined })}
        />
        <Text
          label="Label"
          value={slide.broader?.label ?? ''}
          onChange={(label) => onChange({ broader: { value: slide.broader?.value ?? '', label } })}
        />
        <Text label="Source" value={slide.source ?? ''} onChange={(source) => onChange({ source })} hint="The first question in the room." />
      </div>
    </>
  );
}

function ProductFields({ slide, onChange }: { slide: SlideOf<'product'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <ObjectList
        label="One core workflow"
        items={slide.workflow}
        onChange={(workflow) => onChange({ workflow })}
        create={() => ({ title: '', body: '' })}
        title={(step, index) => step.title || `Step ${index + 1}`}
        addLabel="step"
      >
        {(step, update) => (
          <>
            <Text label="Step" value={step.title} onChange={(title) => update({ title })} />
            <Para label="Detail" value={step.body} rows={2} onChange={(body) => update({ body })} />
          </>
        )}
      </ObjectList>
      <StringList label="Live" values={slide.live} onChange={(live) => onChange({ live })} addLabel="shipped capability" />
      <StringList label="Coming" values={slide.coming} onChange={(coming) => onChange({ coming })} addLabel="planned capability" />
      <Para
        label="Moat, in one line"
        value={slide.moat}
        onChange={(moat) => onChange({ moat })}
        hint="Data, workflow, distribution, switching cost. If you do not have one, leave it empty."
      />
      <MediaField label="Product screenshot" value={slide.media} onChange={(media) => onChange({ media })} />
    </>
  );
}

const EVIDENCE_OPTIONS = (Object.keys(EVIDENCE_LABELS) as EvidenceKind[]).map((kind) => ({
  value: kind,
  label: EVIDENCE_LABELS[kind],
}));

function TractionFields({ slide, onChange }: { slide: SlideOf<'traction'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <ObjectList
        label="Evidence"
        items={slide.evidence}
        onChange={(evidence) => onChange({ evidence })}
        create={() => ({ kind: 'revenue' as const, value: '', label: '' })}
        title={(item) => EVIDENCE_LABELS[item.kind]}
        addLabel="evidence"
      >
        {(item, update) => (
          <>
            <Choice
              label="Kind"
              value={item.kind}
              options={EVIDENCE_OPTIONS}
              onChange={(kind) => update({ kind })}
            />
            <Text label="The number" value={item.value} onChange={(value) => update({ value })} />
            <Text label="What it is" value={item.label} onChange={(label) => update({ label })} />
            <Text label="Customer" value={item.customer ?? ''} onChange={(customer) => update({ customer })} hint="Names beat categories." />
          </>
        )}
      </ObjectList>
      <p className="field__hint">
        The slide renders strongest first regardless of the order here: revenue, then retention, then paid pilots, then
        deposits, then letters of intent.
      </p>
      <ChartField label="Chart (optional)" value={slide.chart} onChange={(chart) => onChange({ chart })} />
    </>
  );
}

function BusinessModelFields({ slide, onChange }: { slide: SlideOf<'businessModel'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <ObjectList
        label="Revenue streams"
        items={slide.streams}
        onChange={(streams) => onChange({ streams })}
        create={() => ({ name: '', description: '', price: '' })}
        title={(stream, index) => stream.name || `Stream ${index + 1}`}
        addLabel="stream"
      >
        {(stream, update) => (
          <>
            <Text label="Name" value={stream.name} onChange={(name) => update({ name })} />
            <Text label="Price" value={stream.price ?? ''} onChange={(price) => update({ price })} />
            <Para label="Who pays, for what, how often" value={stream.description} rows={2} onChange={(description) => update({ description })} />
          </>
        )}
      </ObjectList>
      <Text label="Gross margin" value={slide.grossMargin} onChange={(grossMargin) => onChange({ grossMargin })} hint="Rough is fine. Absent is not." />
      <Para label="What expands the account" value={slide.expansion} onChange={(expansion) => onChange({ expansion })} />
    </>
  );
}

const MOTION_OPTIONS = (Object.keys(MOTION_LABELS) as GoToMarketMotion[]).map((motion) => ({
  value: motion,
  label: MOTION_LABELS[motion],
}));

function GoToMarketFields({ slide, onChange }: { slide: SlideOf<'goToMarket'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <Choice label="Motion" value={slide.motion} options={MOTION_OPTIONS} onChange={(motion) => onChange({ motion })} />
      <Para label="Who sells" value={slide.whoSells} onChange={(whoSells) => onChange({ whoSells })} />
      <Para
        label="The one channel"
        value={slide.primaryChannel}
        onChange={(primaryChannel) => onChange({ primaryChannel })}
        hint="The one you will starve the others for."
      />
      <Text label="CAC" value={slide.cac} onChange={(cac) => onChange({ cac })} />
      <Para
        label="How you defend it"
        value={slide.cacBasis}
        onChange={(cacBasis) => onChange({ cacBasis })}
        hint="Or how this round learns it."
      />
      <ObjectList
        label="The first 100 customers"
        items={slide.steps}
        onChange={(steps) => onChange({ steps })}
        create={() => ({ title: '', body: '' })}
        title={(step, index) => step.title || `Step ${index + 1}`}
        addLabel="step"
      >
        {(step, update) => (
          <>
            <Text label="Step" value={step.title} onChange={(title) => update({ title })} />
            <Para label="Detail" value={step.body} rows={2} onChange={(body) => update({ body })} />
          </>
        )}
      </ObjectList>
    </>
  );
}

function CompetitionFields({ slide, onChange }: { slide: SlideOf<'competition'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <Para
        label="The status quo"
        value={slide.statusQuo}
        onChange={(statusQuo) => onChange({ statusQuo })}
        hint="Spreadsheets, a VA, doing nothing. The competitor most decks omit."
      />
      <ObjectList
        label="Real alternatives"
        items={slide.alternatives}
        onChange={(alternatives) => onChange({ alternatives })}
        create={() => ({ name: '', whatTheyDo: '', whyNotThem: '' })}
        title={(alternative, index) => alternative.name || `Alternative ${index + 1}`}
        addLabel="alternative"
      >
        {(alternative, update) => (
          <>
            <Text label="Name" value={alternative.name} onChange={(name) => update({ name })} />
            <Para label="What they do" value={alternative.whatTheyDo} rows={2} onChange={(whatTheyDo) => update({ whatTheyDo })} />
            <Para
              label="Why your customer does not pick them"
              value={alternative.whyNotThem}
              rows={2}
              onChange={(whyNotThem) => update({ whyNotThem })}
            />
          </>
        )}
      </ObjectList>
      <Para
        label="The one axis you win on"
        value={slide.winningAxis}
        onChange={(winningAxis) => onChange({ winningAxis })}
      />
    </>
  );
}

function TeamFields({ slide, onChange }: { slide: SlideOf<'team'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <ObjectList
        label="Team (three to five)"
        items={slide.people}
        onChange={(people) => onChange({ people })}
        create={() => ({ name: '', role: '', scar: '', credentials: [] })}
        title={(person, index) => person.name || `Person ${index + 1}`}
        addLabel="person"
      >
        {(person, update) => (
          <>
            <Text label="Name" value={person.name} onChange={(name) => update({ name })} />
            <Text label="Role" value={person.role} onChange={(role) => update({ role })} />
            <Para
              label="The relevant scar"
              value={person.scar}
              rows={2}
              onChange={(scar) => update({ scar })}
              hint="What they have already survived that makes them the one to do this."
            />
            <StringList
              label="Credentials"
              values={person.credentials}
              onChange={(credentials) => update({ credentials })}
              addLabel="credential"
            />
            <MediaField label="Photo" value={person.photo} kind="photo" onChange={(photo) => update({ photo })} />
          </>
        )}
      </ObjectList>
      <Para
        label="Who is missing"
        value={slide.missing}
        onChange={(missing) => onChange({ missing })}
        hint="Naming the gap reads as judgement, not weakness."
      />
      <Toggle label="This round hires them" value={slide.hiredWithRound} onChange={(hiredWithRound) => onChange({ hiredWithRound })} />
    </>
  );
}

function AskFields({ slide, onChange }: { slide: SlideOf<'ask'>; onChange: Patch }): ReactNode {
  return (
    <>
      <Para label="Title" value={slide.title} rows={2} onChange={(title) => onChange({ title })} />
      <Text label="How much" value={slide.amount} onChange={(amount) => onChange({ amount })} />
      <Text label="Instrument" value={slide.instrument} onChange={(instrument) => onChange({ instrument })} />
      <ObjectList
        label="What it buys"
        items={slide.buys}
        onChange={(buys) => onChange({ buys })}
        create={() => ({ label: '', amount: '', detail: '' })}
        title={(use, index) => use.label || `Line ${index + 1}`}
        addLabel="line"
      >
        {(use, update) => (
          <>
            <Text label="What" value={use.label} onChange={(label) => update({ label })} />
            <Text label="How much" value={use.amount} onChange={(amount) => update({ amount })} hint="Dollars, not vibes." />
            <Text label="Detail" value={use.detail} onChange={(detail) => update({ detail })} />
          </>
        )}
      </ObjectList>
      <StringList
        label="True 18 months from now"
        values={slide.outcome}
        onChange={(outcome) => onChange({ outcome })}
        addLabel="outcome"
      />
      <Para label="What the next round looks like" value={slide.nextRound} onChange={(nextRound) => onChange({ nextRound })} />
    </>
  );
}

/**
 * Everything else.
 *
 * The supporting and appendix slide types get a form derived from their own
 * fields: strings become inputs, string arrays become lists. It is less
 * considered than the twelve above, which is the right trade: those twelve are
 * the pitch, and these are the appendix.
 */
function GenericFields({ slide, onChange }: { slide: Slide; onChange: Patch }): ReactNode {
  const skip = new Set(['id', 'type', 'notes', 'hidden']);
  const entries = Object.entries(slide).filter(([key]) => !skip.has(key));

  return (
    <>
      {entries.map(([key, value]) => {
        if (typeof value === 'string') {
          const long = key === 'lead' || key === 'text' || key === 'subtitle' || value.length > 60;
          return long ? (
            <Para key={key} label={humanise(key)} value={value} onChange={(next) => onChange({ [key]: next })} />
          ) : (
            <Text key={key} label={humanise(key)} value={value} onChange={(next) => onChange({ [key]: next })} />
          );
        }
        if (typeof value === 'boolean') {
          return <Toggle key={key} label={humanise(key)} value={value} onChange={(next) => onChange({ [key]: next })} />;
        }
        if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
          return (
            <StringList
              key={key}
              label={humanise(key)}
              values={value as string[]}
              onChange={(next) => onChange({ [key]: next })}
            />
          );
        }
        return null;
      })}
      <p className="field__hint">
        Structured content on this slide type is edited in the deck JSON. The twelve pitch slides have full forms.
      </p>
    </>
  );
}

function humanise(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}
