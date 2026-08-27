import { EVIDENCE_LABELS, evidenceStrength } from '@cubpitch/core';
import type { ReactNode } from 'react';
import { Chart } from '../charts.js';
import { Columns, Header, Inline, Label, Panel, Row, Source, Stat } from '../primitives.js';
import type { SlideView } from '../types.js';

/**
 * The second half: proof, money, motion, and the competitive picture.
 */

/** Evidence renders strongest-first regardless of authoring order. */
export const TractionSlideView: SlideView<'traction'> = ({ slide }) => {
  const ranked = [...slide.evidence].sort((a, b) => evidenceStrength(b) - evidenceStrength(a));
  const hasChart = Boolean(slide.chart);

  return (
    <>
      <Header eyebrow="Traction" title={slide.title} lead={slide.lead} />
      <div className="cp-content" style={{ display: 'grid', gridTemplateColumns: hasChart ? '1fr 1.3fr' : '1fr', gap: 64 }}>
        <div>
          {ranked.map((item, index) => (
            <Row key={`${item.label}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 24 }}>
              <div>
                <Label style={{ marginBottom: 8 }}>{EVIDENCE_LABELS[item.kind]}</Label>
                <p className="cp-body">{item.label}</p>
                {item.customer ? (
                  <p className="cp-small" style={{ marginTop: 4, color: 'var(--cp-accent-bright)' }}>
                    {item.customer}
                  </p>
                ) : null}
              </div>
              <span className="cp-stat-value" style={{ fontSize: 'calc(var(--cp-stat) * 0.62)', whiteSpace: 'nowrap' }}>
                {item.value}
              </span>
            </Row>
          ))}
          {ranked.length === 0 ? <p className="cp-lead">No evidence yet.</p> : null}
        </div>
        {slide.chart ? (
          <div>
            <Chart spec={slide.chart} width={880} height={520} />
            <Source text={slide.chart.source} />
          </div>
        ) : null}
      </div>
    </>
  );
};

export const BusinessModelSlideView: SlideView<'businessModel'> = ({ slide }) => (
  <>
    <Header eyebrow="Business model" title={slide.title} lead={slide.lead} />
    <div className="cp-content" style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      <Columns count={Math.min(Math.max(slide.streams.length, 1), 3)} gap={40}>
        {slide.streams.map((stream) => (
          <Panel key={stream.name} style={{ height: '100%' }}>
            <Label style={{ marginBottom: 14 }}>{stream.name}</Label>
            {stream.price ? (
              <p className="cp-stat-value" style={{ fontSize: 'calc(var(--cp-stat) * 0.55)', marginBottom: 12 }}>
                {stream.price}
              </p>
            ) : null}
            <p className="cp-small">
              <Inline text={stream.description} />
            </p>
          </Panel>
        ))}
      </Columns>
      <div style={{ display: 'flex', gap: 80 }}>
        {slide.grossMargin ? <Stat value={slide.grossMargin} label="Gross margin" /> : null}
        {slide.expansion ? (
          <div style={{ flex: 1 }}>
            <Label style={{ marginBottom: 10 }}>What expands the account</Label>
            <p className="cp-body">
              <Inline text={slide.expansion} />
            </p>
          </div>
        ) : null}
      </div>
    </div>
  </>
);

const MOTION_LABEL: Record<string, string> = {
  'founder-led': 'Founder-led sales',
  outbound: 'Outbound',
  inbound: 'Inbound',
  partner: 'Partnerships',
  'product-led': 'Product-led',
  channel: 'Channel',
};

export const GoToMarketSlideView: SlideView<'goToMarket'> = ({ slide }) => (
  <>
    <Header eyebrow="Go to market" title={slide.title} lead={slide.lead} />
    <div className="cp-content" style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      <Columns count={3} gap={40}>
        <Panel>
          <Label style={{ marginBottom: 14 }}>Motion</Label>
          <p className="cp-body">{MOTION_LABEL[slide.motion] ?? slide.motion}</p>
          {slide.whoSells ? (
            <p className="cp-small" style={{ marginTop: 10 }}>
              <Inline text={slide.whoSells} />
            </p>
          ) : null}
        </Panel>
        <Panel style={{ borderColor: 'var(--cp-accent)' }}>
          <Label style={{ marginBottom: 14, color: 'var(--cp-accent-bright)' }}>The one channel</Label>
          <p className="cp-body">
            <Inline text={slide.primaryChannel} />
          </p>
        </Panel>
        <Panel>
          <Label style={{ marginBottom: 14 }}>CAC</Label>
          <p className="cp-stat-value" style={{ fontSize: 'calc(var(--cp-stat) * 0.55)' }}>
            {slide.cac || '—'}
          </p>
          {slide.cacBasis ? (
            <p className="cp-small" style={{ marginTop: 10 }}>
              <Inline text={slide.cacBasis} />
            </p>
          ) : null}
        </Panel>
      </Columns>
      {slide.steps.length > 0 ? (
        <div>
          <Label style={{ marginBottom: 16 }}>The first 100 customers</Label>
          {slide.steps.map((step, index) => (
            <Row key={`${step.title}-${index}`} style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
              <span className="cp-label" style={{ color: 'var(--cp-accent-bright)', minWidth: 44 }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="cp-body">{step.title}</p>
                {step.body ? (
                  <p className="cp-small" style={{ marginTop: 4 }}>
                    <Inline text={step.body} />
                  </p>
                ) : null}
              </div>
            </Row>
          ))}
        </div>
      ) : null}
    </div>
  </>
);

export const CompetitionSlideView: SlideView<'competition'> = ({ slide }) => (
  <>
    <Header eyebrow="Competition" title={slide.title} lead={slide.lead} />
    <div className="cp-content" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {slide.statusQuo ? (
        <Panel style={{ padding: 28 }}>
          <Label style={{ marginBottom: 10 }}>The status quo, which is also a competitor</Label>
          <p className="cp-body">
            <Inline text={slide.statusQuo} />
          </p>
        </Panel>
      ) : null}

      {slide.matrix ? <MatrixTable matrix={slide.matrix} /> : null}
      {!slide.matrix && slide.quadrant ? <Quadrant quadrant={slide.quadrant} /> : null}

      {!slide.matrix && !slide.quadrant && slide.alternatives.length > 0 ? (
        <div>
          {slide.alternatives.map((alternative) => (
            <Row key={alternative.name} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: 32 }}>
              <p className="cp-body">{alternative.name}</p>
              <p className="cp-small">
                <Inline text={alternative.whatTheyDo} />
              </p>
              <p className="cp-small" style={{ color: 'var(--cp-ink)' }}>
                <Inline text={alternative.whyNotThem} />
              </p>
            </Row>
          ))}
        </div>
      ) : null}

      {slide.winningAxis ? (
        <p style={{ fontSize: 'var(--cp-lead)', marginTop: 'auto' }}>
          <span style={{ color: 'var(--cp-accent-bright)' }}>We win on: </span>
          <Inline text={slide.winningAxis} />
        </p>
      ) : null}
    </div>
  </>
);

function MatrixTable({ matrix }: { matrix: NonNullable<Parameters<SlideView<'competition'>>[0]['slide']['matrix']> }): ReactNode {
  const mark = (value: string): ReactNode => {
    if (value === 'yes') return <span style={{ color: 'var(--cp-positive)' }}>●</span>;
    if (value === 'partial') return <span style={{ color: 'var(--cp-caution)' }}>◐</span>;
    return <span style={{ color: 'var(--cp-ink-muted)', opacity: 0.5 }}>○</span>;
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--cp-small)' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '14px 16px' }} />
          {matrix.capabilities.map((capability) => (
            <th key={capability} className="cp-label" style={{ textAlign: 'center', padding: '14px 16px' }}>
              {capability}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {matrix.competitors.map((competitor, rowIndex) => {
          const us = rowIndex === matrix.usIndex;
          return (
            <tr key={competitor} style={{ background: us ? 'var(--cp-surface)' : 'transparent' }}>
              <td
                style={{
                  padding: '18px 16px',
                  borderTop: '1px solid var(--cp-border)',
                  fontSize: 'var(--cp-body)',
                  color: us ? 'var(--cp-accent-bright)' : 'var(--cp-ink)',
                }}
              >
                {competitor}
              </td>
              {matrix.capabilities.map((capability, columnIndex) => (
                <td
                  key={capability}
                  style={{ padding: '18px 16px', borderTop: '1px solid var(--cp-border)', textAlign: 'center', fontSize: 30 }}
                >
                  {mark(matrix.marks[rowIndex]?.[columnIndex] ?? 'no')}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Quadrant({ quadrant }: { quadrant: NonNullable<Parameters<SlideView<'competition'>>[0]['slide']['quadrant']> }): ReactNode {
  const size = 520;
  return (
    <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke="var(--cp-border)" strokeWidth={2} />
        <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke="var(--cp-border)" strokeWidth={2} />
        {quadrant.points.map((point) => (
          <g key={point.label}>
            <circle
              cx={point.x * size}
              cy={(1 - point.y) * size}
              r={point.us ? 16 : 11}
              fill={point.us ? 'var(--cp-accent)' : 'var(--cp-ink-muted)'}
            />
            <text
              x={point.x * size + 24}
              y={(1 - point.y) * size + 8}
              fontSize={22}
              fill={point.us ? 'var(--cp-accent-bright)' : 'var(--cp-ink-muted)'}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <Label>Horizontal</Label>
          <p className="cp-small">
            {quadrant.xAxis[0]} → {quadrant.xAxis[1]}
          </p>
        </div>
        <div>
          <Label>Vertical</Label>
          <p className="cp-small">
            {quadrant.yAxis[0]} → {quadrant.yAxis[1]}
          </p>
        </div>
      </div>
    </div>
  );
}
