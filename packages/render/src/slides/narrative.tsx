import type { ReactNode } from 'react';
import { Columns, Header, Inline, Label, Lead, Media, Panel, Row, Source, Stat } from '../primitives.js';
import type { SlideView } from '../types.js';

/**
 * The first half of the pitch: who hurts, what you built, why now, and who
 * buys. Each component reads the fields its slide type actually has, which is
 * why none of them take a generic "content" prop.
 */

export const CoverSlideView: SlideView<'cover'> = ({ slide, ctx }) => (
  <>
    {slide.background?.src ? (
      <div style={{ position: 'absolute', inset: 0 }}>
        <Media src={slide.background.src} alt={slide.background.alt} fit={slide.background.fit} />
        <div style={{ position: 'absolute', inset: 0, background: 'var(--cp-bg)', opacity: 0.72 }} />
      </div>
    ) : null}
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {slide.logo?.src ? (
        <img src={slide.logo.src} alt={slide.logo.alt} style={{ height: 88, width: 'auto', marginBottom: 48, objectFit: 'contain', alignSelf: 'flex-start' }} />
      ) : null}
      <h1 className="cp-hero">{slide.headline}</h1>
      {slide.oneLiner ? (
        <p style={{ fontSize: ctx.theme.type.lead, marginTop: 36, maxWidth: '26ch', color: 'var(--cp-ink)' }}>
          <Inline text={slide.oneLiner} />
        </p>
      ) : null}
      <div style={{ marginTop: 56, width: 120, height: 4, background: 'var(--cp-accent)' }} />
    </div>
    <div style={{ position: 'relative', display: 'flex', gap: 48 }}>
      {slide.presenter ? <Label>{slide.presenter}</Label> : null}
      {slide.date ? <Label>{slide.date}</Label> : null}
      {slide.confidential ? <Label>{ctx.deck.meta.confidentiality}</Label> : null}
    </div>
  </>
);

export const ProblemSlideView: SlideView<'problem'> = ({ slide }) => (
  <>
    <Header eyebrow="Problem" title={slide.title} />
    <div className="cp-content" style={{ display: 'grid', gridTemplateColumns: slide.media?.src || slide.stat ? '1.4fr 1fr' : '1fr', gap: 72 }}>
      <div>
        {(
          [
            ['Who hurts', slide.who],
            ['What they do today', slide.today],
            ['What it costs them', slide.cost],
            ['Why it is getting worse', slide.worsening],
          ] as const
        )
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <Row key={label}>
              <Label style={{ marginBottom: 10 }}>{label}</Label>
              <p className="cp-body">
                <Inline text={value} />
              </p>
            </Row>
          ))}
      </div>
      {slide.stat ? (
        <Panel style={{ display: 'grid', placeItems: 'center' }}>
          <Stat value={slide.stat.value} label={slide.stat.label} note={slide.stat.note} align="center" />
        </Panel>
      ) : slide.media?.src ? (
        <Media src={slide.media.src} alt={slide.media.alt} fit={slide.media.fit} style={{ borderRadius: 'var(--cp-radius-md)' }} />
      ) : null}
    </div>
  </>
);

export const SolutionSlideView: SlideView<'solution'> = ({ slide }) => (
  <>
    <Header eyebrow="Solution" title={slide.title} lead={slide.lead} />
    <div className="cp-content" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {slide.before || slide.after ? (
        <Columns count={2} gap={48}>
          <Panel>
            <Label style={{ marginBottom: 14 }}>Before</Label>
            <p className="cp-body" style={{ color: 'var(--cp-ink-muted)' }}>
              <Inline text={slide.before} />
            </p>
          </Panel>
          <Panel style={{ borderColor: 'var(--cp-accent)' }}>
            <Label style={{ marginBottom: 14, color: 'var(--cp-accent-bright)' }}>After</Label>
            <p className="cp-body">
              <Inline text={slide.after} />
            </p>
          </Panel>
        </Columns>
      ) : null}
      {slide.inScope.length > 0 || slide.outOfScope.length > 0 ? (
        <Columns count={2} gap={48}>
          <ScopeList label="In scope" items={slide.inScope} tone="var(--cp-ink)" />
          <ScopeList label="Out of scope" items={slide.outOfScope} tone="var(--cp-ink-muted)" />
        </Columns>
      ) : null}
    </div>
  </>
);

function ScopeList({ label, items, tone }: { label: string; items: string[]; tone: string }): ReactNode {
  if (items.length === 0) return null;
  return (
    <div>
      <Label style={{ marginBottom: 16 }}>{label}</Label>
      {items.map((item) => (
        <Row key={item} style={{ paddingTop: 14, paddingBottom: 14 }}>
          <p className="cp-body" style={{ color: tone }}>
            <Inline text={item} />
          </p>
        </Row>
      ))}
    </div>
  );
}

export const WhyNowSlideView: SlideView<'whyNow'> = ({ slide }) => (
  <>
    <Header eyebrow="Why now" title={slide.title} />
    <div className="cp-content" style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      <Columns count={3} gap={40}>
        {(
          [
            ['The shift', slide.shift],
            ['Why incumbents are slow', slide.incumbentLag],
            ['Why the window closes', slide.window],
          ] as const
        ).map(([label, value]) => (
          <Panel key={label} style={{ height: '100%' }}>
            <Label style={{ marginBottom: 16 }}>{label}</Label>
            <p className="cp-body">
              <Inline text={value} />
            </p>
          </Panel>
        ))}
      </Columns>
      {slide.timeline.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${slide.timeline.length}, minmax(0, 1fr))`, gap: 24, marginTop: 8 }}>
          {slide.timeline.map((phase) => (
            <div key={phase.label} style={{ borderTop: '3px solid var(--cp-accent)', paddingTop: 18 }}>
              <Label>{phase.label}</Label>
              <p className="cp-body" style={{ marginTop: 10 }}>
                {phase.title}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  </>
);

export const MarketSlideView: SlideView<'market'> = ({ slide }) => (
  <>
    <Header eyebrow="Market" title={slide.title} lead={slide.lead} />
    <div className="cp-content" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {slide.beachhead ? (
        <Panel style={{ borderColor: 'var(--cp-accent)', padding: 32 }}>
          <Label style={{ marginBottom: 14, color: 'var(--cp-accent-bright)' }}>Beachhead: who buys in the next 12 months</Label>
          <p style={{ fontSize: 'var(--cp-lead)', margin: 0 }}>
            <Inline text={slide.beachhead.segment} />
          </p>
          <div style={{ display: 'flex', gap: 72, marginTop: 20 }}>
            {slide.beachhead.buyerCount ? <Stat value={slide.beachhead.buyerCount} label="Buyers" scale={0.6} /> : null}
            {slide.beachhead.price ? <Stat value={slide.beachhead.price} label="Each pays" scale={0.6} /> : null}
          </div>
        </Panel>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: slide.broader ? '1.5fr 1fr' : '1fr', gap: 48 }}>
        {slide.expansion.length > 0 ? (
          <div>
            <Label style={{ marginBottom: 12 }}>Then</Label>
            {slide.expansion.map((item) => (
              <Row key={item.segment} style={{ paddingTop: 12, paddingBottom: 12 }}>
                <p className="cp-body">{item.segment}</p>
                {item.note ? (
                  <p className="cp-small" style={{ marginTop: 6 }}>
                    <Inline text={item.note} />
                  </p>
                ) : null}
              </Row>
            ))}
          </div>
        ) : null}
        {slide.broader ? (
          <div>
            <Stat value={slide.broader.value} label={slide.broader.label} scale={0.75} />
          </div>
        ) : null}
      </div>
      <Source text={slide.source} />
    </div>
  </>
);

export const ProductSlideView: SlideView<'product'> = ({ slide }) => (
  <>
    <Header eyebrow="Product" title={slide.title} lead={slide.lead} />
    <div className="cp-content" style={{ display: 'grid', gridTemplateColumns: slide.media?.src ? '1fr 1fr' : '1fr', gap: 64 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {slide.workflow.length > 0 ? (
          <div>
            {slide.workflow.map((step, index) => (
              <Row key={`${step.title}-${index}`} style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
                <span className="cp-label" style={{ color: 'var(--cp-accent-bright)', minWidth: 44 }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="cp-body">{step.title}</p>
                  {step.body ? (
                    <p className="cp-small" style={{ marginTop: 6 }}>
                      <Inline text={step.body} />
                    </p>
                  ) : null}
                </div>
              </Row>
            ))}
          </div>
        ) : null}
        {slide.live.length > 0 || slide.coming.length > 0 ? (
          <Columns count={2} gap={32}>
            <StatusList label="Live" items={slide.live} color="var(--cp-positive)" />
            <StatusList label="Coming" items={slide.coming} color="var(--cp-caution)" />
          </Columns>
        ) : null}
      </div>
      {slide.media?.src ? (
        <Media src={slide.media.src} alt={slide.media.alt} fit={slide.media.fit} style={{ borderRadius: 'var(--cp-radius-md)' }} />
      ) : null}
    </div>
    {slide.moat ? (
      <p className="cp-small" style={{ marginTop: 16 }}>
        <span style={{ color: 'var(--cp-accent-bright)' }}>Moat: </span>
        <Inline text={slide.moat} />
      </p>
    ) : null}
  </>
);

function StatusList({ label, items, color }: { label: string; items: string[]; color: string }): ReactNode {
  if (items.length === 0) return null;
  return (
    <div>
      <Label style={{ marginBottom: 12, color }}>{label}</Label>
      {items.map((item) => (
        <p key={item} className="cp-small" style={{ marginBottom: 8 }}>
          {item}
        </p>
      ))}
    </div>
  );
}
