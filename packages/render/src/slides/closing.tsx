import { Chart } from '../charts.js';
import { Columns, Header, Inline, Label, Media, Panel, Row, Source, Stat } from '../primitives.js';
import type { SlideView } from '../types.js';

/** Team, the ask, and the supporting slide types. */

export const TeamSlideView: SlideView<'team'> = ({ slide }) => {
  const columns = Math.min(Math.max(slide.people.length, 1), 5);
  return (
    <>
      <Header eyebrow="Team" title={slide.title} lead={slide.lead} />
      <div className="cp-content" style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        <Columns count={columns} gap={32}>
          {slide.people.map((person) => (
            <div key={person.name}>
              {person.photo?.src ? (
                <Media
                  src={person.photo.src}
                  alt={person.photo.alt}
                  style={{ height: 200, borderRadius: 'var(--cp-radius-md)', marginBottom: 20 }}
                />
              ) : null}
              <p className="cp-body" style={{ fontWeight: 600 }}>
                {person.name}
              </p>
              <Label style={{ marginTop: 6 }}>{person.role}</Label>
              {person.scar ? (
                <p className="cp-small" style={{ marginTop: 14, color: 'var(--cp-ink)' }}>
                  <Inline text={person.scar} />
                </p>
              ) : null}
              {person.credentials.length > 0 ? (
                <p className="cp-small" style={{ marginTop: 10, opacity: 0.8 }}>
                  {person.credentials.join(' · ')}
                </p>
              ) : null}
            </div>
          ))}
        </Columns>
        {slide.missing ? (
          <Panel style={{ padding: 26 }}>
            <Label style={{ marginBottom: 10 }}>Who is missing{slide.hiredWithRound ? ', and this round hires them' : ''}</Label>
            <p className="cp-body">
              <Inline text={slide.missing} />
            </p>
          </Panel>
        ) : null}
        {slide.advisors.length > 0 ? (
          <div>
            <Label style={{ marginBottom: 12 }}>Advisors</Label>
            <p className="cp-small">
              {slide.advisors.map((advisor) => `${advisor.name} (${advisor.role})`).join(' · ')}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
};

export const AskSlideView: SlideView<'ask'> = ({ slide }) => (
  <>
    <Header eyebrow="The ask" title={slide.title} lead={slide.lead} />
    <div className="cp-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 72 }}>
      <div>
        <p className="cp-display" style={{ fontSize: 'calc(var(--cp-display) * 0.6)', color: 'var(--cp-accent-bright)' }}>
          {slide.amount}
        </p>
        {slide.instrument ? <Label style={{ marginTop: 14 }}>{slide.instrument}</Label> : null}
        {slide.buys.length > 0 ? (
          <div style={{ marginTop: 40 }}>
            <Label style={{ marginBottom: 14 }}>What it buys</Label>
            {slide.buys.map((use) => (
              <Row key={use.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, paddingTop: 14, paddingBottom: 14 }}>
                <div>
                  <p className="cp-body">{use.label}</p>
                  {use.detail ? (
                    <p className="cp-small" style={{ marginTop: 4 }}>
                      <Inline text={use.detail} />
                    </p>
                  ) : null}
                </div>
                <span className="cp-body" style={{ color: 'var(--cp-accent-bright)', whiteSpace: 'nowrap' }}>
                  {use.amount}
                </span>
              </Row>
            ))}
          </div>
        ) : null}
      </div>
      <div>
        {slide.outcome.length > 0 ? (
          <Panel style={{ borderColor: 'var(--cp-accent)', padding: 40 }}>
            <Label style={{ marginBottom: 20, color: 'var(--cp-accent-bright)' }}>True 18 months from now</Label>
            {slide.outcome.map((item) => (
              <p key={item} className="cp-body" style={{ marginBottom: 16 }}>
                <Inline text={item} />
              </p>
            ))}
          </Panel>
        ) : null}
        {slide.nextRound ? (
          <div style={{ marginTop: 32 }}>
            <Label style={{ marginBottom: 10 }}>Then the next round</Label>
            <p className="cp-small">
              <Inline text={slide.nextRound} />
            </p>
          </div>
        ) : null}
      </div>
    </div>
  </>
);

export const ClosingSlideView: SlideView<'closing'> = ({ slide }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <h1 className="cp-hero">{slide.headline}</h1>
    {slide.subhead ? (
      <p className="cp-lead" style={{ marginTop: 28 }}>
        <Inline text={slide.subhead} />
      </p>
    ) : null}
    <div style={{ marginTop: 56, width: 120, height: 4, background: 'var(--cp-accent)' }} />
    <div style={{ marginTop: 48, display: 'flex', gap: 56 }}>
      {[slide.contactName, slide.email, slide.phone, slide.website].filter(Boolean).map((item) => (
        <Label key={item}>{item}</Label>
      ))}
    </div>
  </div>
);

export const SectionSlideView: SlideView<'section'> = ({ slide }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    {slide.index !== undefined ? (
      <p className="cp-display" style={{ color: 'var(--cp-accent)', opacity: 0.25 }}>
        {String(slide.index).padStart(2, '0')}
      </p>
    ) : null}
    <h1 className="cp-title" style={{ fontSize: 'calc(var(--cp-title) * 1.4)', marginTop: 12 }}>
      {slide.title}
    </h1>
    {slide.subtitle ? (
      <p className="cp-lead" style={{ marginTop: 24 }}>
        <Inline text={slide.subtitle} />
      </p>
    ) : null}
    {slide.variant === 'appendix' ? <Label style={{ marginTop: 40 }}>Not presented unless asked</Label> : null}
  </div>
);

export const StatementSlideView: SlideView<'statement'> = ({ slide }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <p style={{ fontFamily: 'var(--cp-font-display)', fontSize: 'calc(var(--cp-hero) * 0.62)', lineHeight: 1.05, margin: 0 }}>
      <Inline text={slide.text} />
    </p>
    {slide.attribution ? <Label style={{ marginTop: 40 }}>{slide.attribution}</Label> : null}
  </div>
);

export const QuoteSlideView: SlideView<'quote'> = ({ slide }) => (
  <div style={{ flex: 1, display: 'flex', gap: 56, alignItems: 'center' }}>
    {slide.photo?.src ? (
      <Media src={slide.photo.src} alt={slide.photo.alt} style={{ width: 380, height: 380, borderRadius: 'var(--cp-radius-lg)', flexShrink: 0 }} />
    ) : null}
    <div>
      <p style={{ fontSize: 'calc(var(--cp-lead) * 1.5)', lineHeight: 1.25, margin: 0 }}>
        &ldquo;<Inline text={slide.text} />&rdquo;
      </p>
      <div style={{ marginTop: 36, width: 80, height: 3, background: 'var(--cp-accent)' }} />
      <p className="cp-body" style={{ marginTop: 24 }}>
        {slide.author}
      </p>
      <Label style={{ marginTop: 8 }}>{[slide.role, slide.org].filter(Boolean).join(', ')}</Label>
    </div>
  </div>
);

export const AgendaSlideView: SlideView<'agenda'> = ({ slide }) => (
  <>
    <Header title={slide.title} />
    <div className="cp-content">
      {slide.items.map((item, index) => (
        <Row key={item} style={{ display: 'flex', gap: 32, alignItems: 'baseline', paddingTop: 22, paddingBottom: 22 }}>
          <span className="cp-label" style={{ color: 'var(--cp-accent-bright)', minWidth: 48 }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <p style={{ fontSize: 'var(--cp-lead)', margin: 0 }}>{item}</p>
        </Row>
      ))}
    </div>
  </>
);

export const MetricsSlideView: SlideView<'metrics'> = ({ slide }) => (
  <>
    <Header eyebrow={slide.period} title={slide.title} />
    <div className="cp-content">
      <Columns count={Math.min(Math.max(slide.stats.length, 1), 4)} gap={40}>
        {slide.stats.map((stat) => (
          <Panel key={stat.label} style={{ height: '100%' }}>
            <Stat value={stat.value} label={stat.label} note={stat.note} />
            {stat.delta ? (
              <p className="cp-small" style={{ marginTop: 10, color: stat.trend === 'down' ? 'var(--cp-negative)' : 'var(--cp-positive)' }}>
                {stat.delta}
              </p>
            ) : null}
          </Panel>
        ))}
      </Columns>
    </div>
  </>
);

export const MoatSlideView: SlideView<'moat'> = ({ slide }) => (
  <>
    <Header eyebrow="Defensibility" title={slide.title} lead={slide.lead} />
    <div className="cp-content">
      <Columns count={Math.min(Math.max(slide.pillars.length, 1), 4)} gap={40}>
        {slide.pillars.map((pillar) => (
          <Panel key={pillar.title} style={{ height: '100%' }}>
            {pillar.badge ? <Label style={{ marginBottom: 14, color: 'var(--cp-accent-bright)' }}>{pillar.badge}</Label> : null}
            <p className="cp-body" style={{ fontWeight: 600 }}>
              {pillar.title}
            </p>
            <p className="cp-small" style={{ marginTop: 12 }}>
              <Inline text={pillar.body} />
            </p>
          </Panel>
        ))}
      </Columns>
    </div>
  </>
);

export const HowItWorksSlideView: SlideView<'howItWorks'> = ({ slide }) => (
  <>
    <Header title={slide.title} lead={slide.lead} />
    <div className="cp-content" style={{ display: 'flex', alignItems: 'stretch', gap: 24 }}>
      {slide.steps.map((step, index) => (
        <div key={`${step.title}-${index}`} style={{ flex: 1, display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <Label style={{ color: 'var(--cp-accent-bright)', marginBottom: 16 }}>{String(index + 1).padStart(2, '0')}</Label>
            <p className="cp-body" style={{ fontWeight: 600 }}>
              {step.title}
            </p>
            <p className="cp-small" style={{ marginTop: 12 }}>
              <Inline text={step.body} />
            </p>
          </div>
          {index < slide.steps.length - 1 ? (
            <div style={{ width: 2, background: 'var(--cp-border)', alignSelf: 'stretch' }} />
          ) : null}
        </div>
      ))}
    </div>
  </>
);

export const RoadmapSlideView: SlideView<'roadmap'> = ({ slide }) => (
  <>
    <Header title={slide.title} lead={slide.lead} />
    <div className="cp-content">
      <Columns count={Math.min(Math.max(slide.phases.length, 1), 4)} gap={32}>
        {slide.phases.map((phase) => {
          const color =
            phase.state === 'done' ? 'var(--cp-positive)' : phase.state === 'active' ? 'var(--cp-accent)' : 'var(--cp-border)';
          return (
            <div key={phase.label} style={{ borderTop: `4px solid ${color}`, paddingTop: 24 }}>
              <Label style={{ color }}>{phase.label}</Label>
              <p className="cp-body" style={{ marginTop: 12, fontWeight: 600 }}>
                {phase.title}
              </p>
              {phase.items.map((item) => (
                <p key={item} className="cp-small" style={{ marginTop: 10 }}>
                  {item}
                </p>
              ))}
            </div>
          );
        })}
      </Columns>
    </div>
  </>
);

export const FinancialsSlideView: SlideView<'financials'> = ({ slide }) => (
  <>
    <Header title={slide.title} lead={slide.lead} />
    <div className="cp-content" style={{ display: 'grid', gridTemplateColumns: slide.table && slide.chart ? '1fr 1fr' : '1fr', gap: 56 }}>
      {slide.table ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--cp-small)' }}>
          <thead>
            <tr>
              {slide.table.columns.map((column, index) => (
                <th key={`${column.label}-${index}`} className="cp-label" style={{ textAlign: column.align, padding: '12px 14px' }}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slide.table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ background: row.emphasis ? 'var(--cp-surface)' : 'transparent' }}>
                {row.cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: '14px',
                      borderTop: '1px solid var(--cp-border)',
                      textAlign: slide.table?.columns[cellIndex]?.align ?? 'left',
                      fontWeight: row.emphasis ? 600 : 400,
                      fontSize: 'var(--cp-body)',
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {slide.chart ? <Chart spec={slide.chart} width={820} height={480} /> : null}
    </div>
    {slide.assumptions.length > 0 ? (
      <p className="cp-small" style={{ marginTop: 16 }}>
        Assumptions: {slide.assumptions.join(' · ')}
      </p>
    ) : null}
    <Source text={slide.table?.source} />
  </>
);

export const UseOfFundsSlideView: SlideView<'useOfFunds'> = ({ slide }) => (
  <>
    <Header title={slide.title} lead={slide.lead} />
    <div className="cp-content" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 64 }}>
      <div>
        {slide.allocations.map((allocation, index) => (
          <div key={allocation.label} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="cp-body">{allocation.label}</span>
              <span className="cp-body" style={{ color: 'var(--cp-accent-bright)' }}>
                {allocation.percent}%
              </span>
            </div>
            <div style={{ height: 14, background: 'var(--cp-surface)', borderRadius: 'var(--cp-radius-sm)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${allocation.percent}%`,
                  height: '100%',
                  background: `var(--cp-chart-${index % 6})`,
                }}
              />
            </div>
            {allocation.note ? (
              <p className="cp-small" style={{ marginTop: 8 }}>
                {allocation.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40, justifyContent: 'center' }}>
        {slide.total ? <Stat value={slide.total} label="Total raise" /> : null}
        {slide.runway ? <Stat value={slide.runway} label="Runway" /> : null}
      </div>
    </div>
  </>
);

export const LogosSlideView: SlideView<'logos'> = ({ slide }) => (
  <>
    <Header title={slide.title} lead={slide.lead} />
    <div className="cp-content">
      <Columns count={Math.min(Math.max(Math.ceil(slide.logos.length / 2), 2), 5)} gap={40}>
        {slide.logos.map((logo) => (
          <Panel key={logo.name} style={{ display: 'grid', placeItems: 'center', minHeight: 160 }}>
            {logo.image?.src ? (
              <img src={logo.image.src} alt={logo.image.alt || logo.name} style={{ maxWidth: '80%', maxHeight: 90, objectFit: 'contain' }} />
            ) : (
              <span className="cp-body">{logo.name}</span>
            )}
            {logo.note ? (
              <p className="cp-small" style={{ marginTop: 10 }}>
                {logo.note}
              </p>
            ) : null}
          </Panel>
        ))}
      </Columns>
    </div>
  </>
);

export const BulletsSlideView: SlideView<'bullets'> = ({ slide }) => (
  <>
    <Header title={slide.title} lead={slide.lead} />
    <div className="cp-content">
      {slide.bullets.map((bullet, index) => (
        <Row key={index} style={{ paddingTop: 20, paddingBottom: 20 }}>
          <p
            style={{
              fontSize: bullet.emphasis ? 'var(--cp-lead)' : 'var(--cp-body)',
              color: bullet.emphasis ? 'var(--cp-ink)' : 'var(--cp-ink-muted)',
              margin: 0,
            }}
          >
            <Inline text={bullet.text} />
          </p>
        </Row>
      ))}
    </div>
  </>
);

export const ImageSlideView: SlideView<'image'> = ({ slide }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
    <Media src={slide.media.src} alt={slide.media.alt} fit={slide.media.fit} style={{ flex: 1 }} />
    {slide.title || slide.caption ? (
      <div style={{ padding: '32px 112px', background: 'var(--cp-bg)' }}>
        {slide.title ? <p className="cp-body">{slide.title}</p> : null}
        {slide.caption ? <p className="cp-small">{slide.caption}</p> : null}
      </div>
    ) : null}
  </div>
);
