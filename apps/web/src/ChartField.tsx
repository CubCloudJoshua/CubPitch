import type { ChartSpec, ValueFormat } from '@cubpitch/core';
import type { ReactNode } from 'react';
import { Choice } from './fields.js';

/**
 * Building a chart by hand.
 *
 * A pitch chart is small: one or two series, a handful of points, a shape and a
 * format. So this is a plain form over the ChartSpec rather than a charting UI.
 * The point values are the only numbers in the whole deck model the author
 * types as numbers rather than as formatted strings, because a chart has to do
 * arithmetic (stack, scale, find a max) that a string cannot.
 *
 * The same spec draws the on-slide SVG, the PDF, and a native editable
 * PowerPoint chart, so what the author builds here is what every output shows.
 */

const KINDS: Array<{ value: ChartSpec['kind']; label: string }> = [
  { value: 'bar', label: 'Bar' },
  { value: 'stackedBar', label: 'Stacked bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'donut', label: 'Donut' },
];

const FORMATS: Array<{ value: ValueFormat; label: string }> = [
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'percent', label: 'Percent' },
  { value: 'compact', label: 'Compact (1.2K)' },
];

function emptyChart(): ChartSpec {
  return {
    kind: 'bar',
    series: [{ name: 'Series 1', points: [{ label: 'Q1', value: 0 }] }],
    format: 'number',
    currency: 'USD',
    showLegend: true,
    showValues: false,
  };
}

export function ChartField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ChartSpec | undefined;
  onChange: (chart: ChartSpec | undefined) => void;
}): ReactNode {
  if (!value) {
    return (
      <div className="field">
        <p className="label">{label}</p>
        <button className="btn" onClick={() => onChange(emptyChart())}>
          + Add a chart
        </button>
      </div>
    );
  }

  const chart = value;
  const set = (patch: Partial<ChartSpec>): void => onChange({ ...chart, ...patch });

  const setSeries = (index: number, patch: Partial<ChartSpec['series'][number]>): void =>
    set({ series: chart.series.map((series, i) => (i === index ? { ...series, ...patch } : series)) });

  const donut = chart.kind === 'donut';
  // A donut is a single ring, so labels there are categories on one series.
  const labels = chart.series[0]?.points.map((point) => point.label) ?? [];

  const setLabel = (pointIndex: number, text: string): void =>
    set({
      series: chart.series.map((series) => ({
        ...series,
        points: series.points.map((point, i) => (i === pointIndex ? { ...point, label: text } : point)),
      })),
    });

  const setValue = (seriesIndex: number, pointIndex: number, raw: string): void => {
    const num = Number(raw.replace(/[, ]/g, ''));
    setSeries(seriesIndex, {
      points: chart.series[seriesIndex]!.points.map((point, i) =>
        i === pointIndex ? { ...point, value: Number.isFinite(num) ? num : 0 } : point,
      ),
    });
  };

  const addPoint = (): void =>
    set({
      series: chart.series.map((series) => ({
        ...series,
        points: [...series.points, { label: `P${series.points.length + 1}`, value: 0 }],
      })),
    });

  const removePoint = (pointIndex: number): void =>
    set({
      series: chart.series.map((series) => ({
        ...series,
        points: series.points.filter((_, i) => i !== pointIndex),
      })),
    });

  const addSeries = (): void => {
    const width = labels.length || 1;
    set({
      series: [
        ...chart.series,
        {
          name: `Series ${chart.series.length + 1}`,
          points: Array.from({ length: width }, (_, i) => ({ label: labels[i] ?? `P${i + 1}`, value: 0 })),
        },
      ],
    });
  };

  const removeSeries = (index: number): void => set({ series: chart.series.filter((_, i) => i !== index) });

  return (
    <div className="field">
      <div className="card__head">
        <p className="label">{label}</p>
        <button className="btn btn--icon btn--danger" onClick={() => onChange(undefined)} title="Remove the chart">
          ×
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Choice label="Kind" value={chart.kind} options={KINDS} onChange={(kind) => set({ kind })} />
        </div>
        <div style={{ flex: 1 }}>
          <Choice label="Format" value={chart.format} options={FORMATS} onChange={(format) => set({ format })} />
        </div>
      </div>

      {/* The shared point labels, edited once. */}
      <div className="card">
        <div className="card__head">
          <span className="label">{donut ? 'Segments' : 'Points'}</span>
          <button className="btn btn--icon" onClick={addPoint} title="Add a point">
            +
          </button>
        </div>
        {labels.map((label_, pointIndex) => (
          <div className="list__row" key={pointIndex}>
            <input
              className="input"
              style={{ flex: 1 }}
              value={label_}
              placeholder="Label"
              onChange={(event) => setLabel(pointIndex, event.target.value)}
            />
            {donut ? (
              <input
                className="input"
                style={{ width: 90 }}
                inputMode="decimal"
                value={String(chart.series[0]?.points[pointIndex]?.value ?? 0)}
                onChange={(event) => setValue(0, pointIndex, event.target.value)}
              />
            ) : null}
            <button className="btn btn--icon btn--danger" onClick={() => removePoint(pointIndex)} title="Remove">
              ×
            </button>
          </div>
        ))}
      </div>

      {/* One block of values per series, unless this is a donut. */}
      {!donut
        ? chart.series.map((series, seriesIndex) => (
            <div className="card" key={seriesIndex}>
              <div className="card__head">
                <input
                  className="input"
                  style={{ flex: 1, marginRight: 6 }}
                  value={series.name}
                  placeholder="Series name"
                  onChange={(event) => setSeries(seriesIndex, { name: event.target.value })}
                />
                {chart.series.length > 1 ? (
                  <button className="btn btn--icon btn--danger" onClick={() => removeSeries(seriesIndex)} title="Remove series">
                    ×
                  </button>
                ) : null}
              </div>
              {series.points.map((point, pointIndex) => (
                <div className="list__row" key={pointIndex}>
                  <span className="label" style={{ width: 80, paddingTop: 8 }}>
                    {labels[pointIndex] ?? point.label}
                  </span>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    inputMode="decimal"
                    value={String(point.value)}
                    onChange={(event) => setValue(seriesIndex, pointIndex, event.target.value)}
                  />
                </div>
              ))}
            </div>
          ))
        : null}

      {!donut ? (
        <button className="btn" onClick={addSeries} style={{ marginBottom: 10 }}>
          + Add a series
        </button>
      ) : null}

      <input
        className="input"
        style={{ marginBottom: 8 }}
        placeholder="Source (where the numbers came from)"
        value={chart.source ?? ''}
        onChange={(event) => set({ source: event.target.value })}
      />

      <div style={{ display: 'flex', gap: 16 }}>
        <label className="label" style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={chart.showLegend} onChange={(event) => set({ showLegend: event.target.checked })} />
          Legend
        </label>
        <label className="label" style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={chart.showValues} onChange={(event) => set({ showValues: event.target.checked })} />
          Value labels
        </label>
      </div>
    </div>
  );
}
