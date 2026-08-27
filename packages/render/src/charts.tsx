import type { ChartSpec, ValueFormat } from '@cubpitch/core';
import type { ReactNode } from 'react';

/**
 * Charts, drawn as inline SVG.
 *
 * No chart library. A library would have to run in the browser, in the PDF
 * renderer, and in a Node process with no DOM, and would pull a megabyte of
 * JavaScript into a document whose whole job is to be a picture. Four chart
 * shapes cover what a pitch deck actually plots, and inline SVG renders
 * identically in all three places.
 *
 * PowerPoint gets native charts instead, built from the same ChartSpec, so the
 * numbers stay editable there rather than arriving as a picture.
 */

export function formatValue(value: number, format: ValueFormat, currency = 'USD'): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
    case 'percent':
      return `${Math.round(value * 100) / 100}%`;
    case 'compact':
      return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
}

interface ChartProps {
  spec: ChartSpec;
  width: number;
  height: number;
}

const AXIS_COLOR = 'var(--cp-border)';
const TEXT_COLOR = 'var(--cp-ink-muted)';
const LABEL_SIZE = 20;

function seriesColor(index: number): string {
  // The theme publishes six; wrap rather than run out.
  return `var(--cp-chart-${index % 6})`;
}

/** Rounded to a readable ceiling so the top gridline is a number, not 4,873. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

export function Chart({ spec, width, height }: ChartProps): ReactNode {
  switch (spec.kind) {
    case 'donut':
      return <DonutChart spec={spec} width={width} height={height} />;
    case 'line':
    case 'area':
      return <LineChart spec={spec} width={width} height={height} />;
    default:
      return <BarChart spec={spec} width={width} height={height} />;
  }
}

function useScale(spec: ChartSpec, width: number, height: number) {
  const padLeft = 100;
  const padBottom = 56;
  const padTop = 24;
  const padRight = 16;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const stacked = spec.kind === 'stackedBar';
  const labels = spec.series[0]?.points.map((point) => point.label) ?? [];

  const rawMax = stacked
    ? Math.max(
        ...labels.map((_, index) => spec.series.reduce((sum, series) => sum + (series.points[index]?.value ?? 0), 0)),
      )
    : Math.max(...spec.series.flatMap((series) => series.points.map((point) => point.value)));

  const max = niceMax(rawMax);
  return { padLeft, padBottom, padTop, padRight, plotWidth, plotHeight, labels, max, stacked };
}

function Gridlines({
  max,
  spec,
  padLeft,
  padTop,
  plotWidth,
  plotHeight,
}: {
  max: number;
  spec: ChartSpec;
  padLeft: number;
  padTop: number;
  plotWidth: number;
  plotHeight: number;
}): ReactNode {
  const lines = [0, 0.25, 0.5, 0.75, 1];
  return (
    <g>
      {lines.map((fraction) => {
        const y = padTop + plotHeight * (1 - fraction);
        return (
          <g key={fraction}>
            <line x1={padLeft} y1={y} x2={padLeft + plotWidth} y2={y} stroke={AXIS_COLOR} strokeWidth={1} />
            <text x={padLeft - 16} y={y + 7} textAnchor="end" fontSize={LABEL_SIZE} fill={TEXT_COLOR}>
              {formatValue(max * fraction, spec.format, spec.currency)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function CategoryLabels({
  labels,
  padLeft,
  padTop,
  plotWidth,
  plotHeight,
}: {
  labels: string[];
  padLeft: number;
  padTop: number;
  plotWidth: number;
  plotHeight: number;
}): ReactNode {
  const band = plotWidth / Math.max(labels.length, 1);
  return (
    <g>
      {labels.map((label, index) => (
        <text
          key={`${label}-${index}`}
          x={padLeft + band * index + band / 2}
          y={padTop + plotHeight + 34}
          textAnchor="middle"
          fontSize={LABEL_SIZE}
          fill={TEXT_COLOR}
        >
          {label}
        </text>
      ))}
    </g>
  );
}

function Legend({ spec, width, y }: { spec: ChartSpec; width: number; y: number }): ReactNode {
  if (!spec.showLegend || spec.series.length < 2) return null;
  return (
    <g>
      {spec.series.map((series, index) => {
        const x = 100 + index * (width / Math.max(spec.series.length, 1));
        return (
          <g key={series.name}>
            <rect x={x} y={y - 14} width={16} height={16} rx={3} fill={seriesColor(index)} />
            <text x={x + 26} y={y} fontSize={LABEL_SIZE} fill={TEXT_COLOR}>
              {series.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function BarChart({ spec, width, height }: ChartProps): ReactNode {
  const { padLeft, padTop, plotWidth, plotHeight, labels, max, stacked } = useScale(spec, width, height);
  const band = plotWidth / Math.max(labels.length, 1);
  const groupCount = stacked ? 1 : spec.series.length;
  const barWidth = (band * 0.62) / groupCount;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img">
      <Gridlines max={max} spec={spec} padLeft={padLeft} padTop={padTop} plotWidth={plotWidth} plotHeight={plotHeight} />
      {labels.map((label, pointIndex) => {
        let stackBase = 0;
        return (
          <g key={`${label}-${pointIndex}`}>
            {spec.series.map((series, seriesIndex) => {
              const value = series.points[pointIndex]?.value ?? 0;
              const barHeight = (value / max) * plotHeight;
              const x = stacked
                ? padLeft + band * pointIndex + band * 0.19
                : padLeft + band * pointIndex + band * 0.19 + barWidth * seriesIndex;
              const y = stacked
                ? padTop + plotHeight - barHeight - (stackBase / max) * plotHeight
                : padTop + plotHeight - barHeight;
              stackBase += stacked ? value : 0;
              return (
                <g key={series.name}>
                  <rect
                    x={x}
                    y={y}
                    width={stacked ? band * 0.62 : barWidth}
                    height={Math.max(barHeight, 0)}
                    fill={seriesColor(seriesIndex)}
                    rx={2}
                  />
                  {spec.showValues && !stacked ? (
                    <text x={x + barWidth / 2} y={y - 10} textAnchor="middle" fontSize={LABEL_SIZE} fill={TEXT_COLOR}>
                      {formatValue(value, spec.format, spec.currency)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}
      <CategoryLabels labels={labels} padLeft={padLeft} padTop={padTop} plotWidth={plotWidth} plotHeight={plotHeight} />
      <Legend spec={spec} width={width - 200} y={height - 8} />
    </svg>
  );
}

function LineChart({ spec, width, height }: ChartProps): ReactNode {
  const { padLeft, padTop, plotWidth, plotHeight, labels, max } = useScale(spec, width, height);
  const step = plotWidth / Math.max(labels.length - 1, 1);
  const pointAt = (index: number, value: number): [number, number] => [
    padLeft + step * index,
    padTop + plotHeight - (value / max) * plotHeight,
  ];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img">
      <Gridlines max={max} spec={spec} padLeft={padLeft} padTop={padTop} plotWidth={plotWidth} plotHeight={plotHeight} />
      {spec.series.map((series, seriesIndex) => {
        const coords = series.points.map((point, index) => pointAt(index, point.value));
        const path = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
        const areaPath = `${path} L${coords.at(-1)?.[0] ?? padLeft},${padTop + plotHeight} L${padLeft},${padTop + plotHeight} Z`;
        return (
          <g key={series.name}>
            {spec.kind === 'area' ? <path d={areaPath} fill={seriesColor(seriesIndex)} opacity={0.18} /> : null}
            <path d={path} fill="none" stroke={seriesColor(seriesIndex)} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
            {coords.map(([x, y], index) => (
              <circle key={index} cx={x} cy={y} r={6} fill={seriesColor(seriesIndex)} />
            ))}
          </g>
        );
      })}
      <CategoryLabels labels={labels} padLeft={padLeft} padTop={padTop} plotWidth={plotWidth} plotHeight={plotHeight} />
      <Legend spec={spec} width={width - 200} y={height - 8} />
    </svg>
  );
}

function DonutChart({ spec, width, height }: ChartProps): ReactNode {
  const points = spec.series[0]?.points ?? [];
  const total = points.reduce((sum, point) => sum + point.value, 0) || 1;
  const size = Math.min(width * 0.5, height);
  const radius = size / 2 - 12;
  const inner = radius * 0.62;
  const cx = size / 2;
  const cy = height / 2;

  let angle = -Math.PI / 2;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img">
      {points.map((point, index) => {
        const sweep = (point.value / total) * Math.PI * 2;
        const end = angle + sweep;
        const large = sweep > Math.PI ? 1 : 0;
        const path = [
          `M${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`,
          `A${radius},${radius} 0 ${large} 1 ${cx + Math.cos(end) * radius},${cy + Math.sin(end) * radius}`,
          `L${cx + Math.cos(end) * inner},${cy + Math.sin(end) * inner}`,
          `A${inner},${inner} 0 ${large} 0 ${cx + Math.cos(angle) * inner},${cy + Math.sin(angle) * inner}`,
          'Z',
        ].join(' ');
        angle = end;
        return <path key={`${point.label}-${index}`} d={path} fill={seriesColor(index)} />;
      })}
      {points.map((point, index) => (
        <g key={`legend-${point.label}-${index}`}>
          <rect x={size + 48} y={cy - points.length * 22 + index * 44} width={18} height={18} rx={3} fill={seriesColor(index)} />
          <text x={size + 78} y={cy - points.length * 22 + index * 44 + 15} fontSize={26} fill="var(--cp-ink)">
            {point.label}
          </text>
          <text x={size + 78} y={cy - points.length * 22 + index * 44 + 15} fontSize={26} fill={TEXT_COLOR} textAnchor="end" dx={520}>
            {formatValue(point.value, spec.format, spec.currency)}
          </text>
        </g>
      ))}
    </svg>
  );
}
