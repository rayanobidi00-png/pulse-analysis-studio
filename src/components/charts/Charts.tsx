// SVG chart components (D3 scales and shapes, rendered by React so they follow the theme).
import { scaleBand, scaleLinear } from 'd3-scale';
import { arc, line, pie } from 'd3-shape';
import { AxisBottom, AxisLeft, BandAxisBottom } from './axes';
import { PALETTE } from './ChartFrame';
import { boxStats } from '../../stats/descriptive';

export interface Marker {
  x: number;
  label: string;
  color: string;
  dashed?: boolean;
}

const W = 640;

/** Histogram with integer-width bins (R: geom_histogram(binwidth = 1)). */
export function HistogramSvg({
  values, binWidth = 1, domain, xLabel, yLabel, color = 'var(--teal)', colorFn, markers = [], height = 300,
}: {
  values: readonly number[]; binWidth?: number; domain?: [number, number]; xLabel: string; yLabel: string;
  color?: string; colorFn?: (binStart: number) => string; markers?: Marker[]; height?: number;
}) {
  const m = { t: 20, r: 16, b: 46, l: 52 };
  const lo = domain ? domain[0] : Math.floor(Math.min(...values) / binWidth) * binWidth;
  const hi = domain ? domain[1] : Math.ceil((Math.max(...values) + 1e-9) / binWidth) * binWidth;
  const nb = Math.max(1, Math.round((hi - lo) / binWidth) + (binWidth === 1 ? 1 : 0));
  const counts = new Array<number>(nb).fill(0);
  for (const v of values) {
    const i = Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / binWidth + (binWidth === 1 ? 0.5 : 0))));
    counts[i]++;
  }
  const x0 = binWidth === 1 ? lo - 0.5 : lo;
  const x1 = binWidth === 1 ? hi + 0.5 : hi;
  const x = scaleLinear().domain([x0, x1]).range([m.l, W - m.r]);
  const y = scaleLinear().domain([0, Math.max(...counts) * 1.1]).nice().range([height - m.b, m.t]);
  return (
    <>
      <AxisLeft scale={y} x={m.l} label={yLabel} grid={W - m.l - m.r} />
      {counts.map((c, i) => {
        const s = x0 + i * binWidth;
        return (
          <rect key={i} x={x(s) + 1} width={Math.max(0, x(s + binWidth) - x(s) - 2)} y={y(c)} height={y(0) - y(c)}
            fill={colorFn ? colorFn(binWidth === 1 ? s + 0.5 : s) : color} rx={2}>
            <title>{`${binWidth === 1 ? s + 0.5 : `${s.toFixed(2)}–${(s + binWidth).toFixed(2)}`}: ${c}`}</title>
          </rect>
        );
      })}
      {markers.map((mk) => (
        <g key={mk.label}>
          <line x1={x(mk.x)} x2={x(mk.x)} y1={m.t - 4} y2={height - m.b} stroke={mk.color} strokeWidth={2} strokeDasharray={mk.dashed ? '5 4' : undefined} />
          <text x={x(mk.x) + 5} y={m.t + 6} style={{ fontSize: 11, fill: mk.color, fontWeight: 600 }}>{mk.label}</text>
        </g>
      ))}
      <AxisBottom scale={x} y={height - m.b} label={xLabel} width={W} />
    </>
  );
}

export interface BoxGroup {
  label: string;
  values: readonly number[];
  color?: string;
}

export function BoxPlotSvg({
  groups, xLabel, yLabel, height = 320, yDomain, highlightOutliers = true,
}: { groups: BoxGroup[]; xLabel: string; yLabel: string; height?: number; yDomain?: [number, number]; highlightOutliers?: boolean }) {
  const m = { t: 16, r: 16, b: 46, l: 52 };
  const all = groups.flatMap((g) => [...g.values]);
  const x = scaleBand().domain(groups.map((g) => g.label)).range([m.l, W - m.r]).padding(0.35);
  const y = scaleLinear().domain(yDomain ?? [Math.min(...all), Math.max(...all)]).nice().range([height - m.b, m.t]);
  return (
    <>
      <AxisLeft scale={y} x={m.l} label={yLabel} grid={W - m.l - m.r} />
      {groups.map((g, gi) => {
        const b = boxStats(g.values);
        const cx = (x(g.label) ?? 0) + x.bandwidth() / 2;
        const bw = x.bandwidth();
        const col = g.color ?? PALETTE[gi % PALETTE.length];
        return (
          <g key={g.label}>
            <line x1={cx} x2={cx} y1={y(b.whiskerLo)} y2={y(b.q1)} stroke="var(--muted)" />
            <line x1={cx} x2={cx} y1={y(b.q3)} y2={y(b.whiskerHi)} stroke="var(--muted)" />
            <line x1={cx - bw / 6} x2={cx + bw / 6} y1={y(b.whiskerLo)} y2={y(b.whiskerLo)} stroke="var(--muted)" />
            <line x1={cx - bw / 6} x2={cx + bw / 6} y1={y(b.whiskerHi)} y2={y(b.whiskerHi)} stroke="var(--muted)" />
            <rect x={cx - bw / 2} width={bw} y={y(b.q3)} height={Math.max(1, y(b.q1) - y(b.q3))} fill={col} fillOpacity={0.8} stroke={col} rx={4}>
              <title>{`${g.label}: Q1 ${b.q1}, median ${b.median}, Q3 ${b.q3}, mean ${b.mean.toFixed(2)}, n ${g.values.length}`}</title>
            </rect>
            <line x1={cx - bw / 2} x2={cx + bw / 2} y1={y(b.median)} y2={y(b.median)} stroke="var(--ink)" strokeWidth={2.5} />
            <path d={`M${cx},${y(b.mean) - 6}l6,6l-6,6l-6,-6z`} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.2} />
            {b.outliers.map((o, i) => (
              <circle key={i} cx={cx + ((i % 7) - 3) * 2.2} cy={y(o)} r={3.2}
                fill={highlightOutliers ? 'var(--coral)' : 'var(--muted)'} fillOpacity={0.75} />
            ))}
          </g>
        );
      })}
      <BandAxisBottom scale={x} y={height - m.b} label={xLabel} width={W} />
    </>
  );
}

export interface Bar {
  label: string;
  value: number;
  color?: string;
  note?: string;
}

/** Horizontal bar chart (labels on the left); handles negative values with a zero line. */
export function HBarSvg({
  bars, valueFormat = (v: number) => v.toFixed(2), xLabel, height, domain, labelWidth = 150, onClick,
}: {
  bars: Bar[]; valueFormat?: (v: number) => string; xLabel?: string; height?: number; domain?: [number, number];
  labelWidth?: number; onClick?: (label: string) => void;
}) {
  const rowH = 30;
  const h = height ?? bars.length * rowH + 56;
  const m = { t: 8, r: 64, b: xLabel ? 46 : 20, l: labelWidth };
  const lo = Math.min(0, ...bars.map((b) => b.value));
  const hi = Math.max(0, ...bars.map((b) => b.value));
  const x = scaleLinear().domain(domain ?? [lo, hi]).nice().range([m.l, W - m.r]);
  const y = scaleBand().domain(bars.map((b) => b.label)).range([m.t, h - m.b]).padding(0.25);
  return (
    <>
      <AxisBottom scale={x} y={h - m.b} label={xLabel} width={W} grid={h - m.b - m.t} />
      <line x1={x(0)} x2={x(0)} y1={m.t} y2={h - m.b} stroke="var(--muted)" />
      {bars.map((b, i) => {
        const x0 = x(Math.min(0, b.value));
        const w = Math.abs(x(b.value) - x(0));
        const yy = y(b.label) ?? 0;
        return (
          <g key={b.label} onClick={onClick ? () => onClick(b.label) : undefined} style={onClick ? { cursor: 'pointer' } : undefined}>
            <text x={m.l - 8} y={yy + y.bandwidth() / 2} dy="0.32em" textAnchor="end" style={{ fontSize: 12, fill: 'var(--ink)' }}>
              {b.label}
            </text>
            <rect x={x0} y={yy} width={Math.max(1, w)} height={y.bandwidth()} rx={3} fill={b.color ?? PALETTE[i % PALETTE.length]}>
              <title>{`${b.label}: ${valueFormat(b.value)}${b.note ? ` ${b.note}` : ''}`}</title>
            </rect>
            <text x={b.value >= 0 ? x(b.value) + 6 : x(b.value) - 6} y={yy + y.bandwidth() / 2} dy="0.32em"
              textAnchor={b.value >= 0 ? 'start' : 'end'} className="mono" style={{ fontSize: 11, fill: 'var(--ink)' }}>
              {valueFormat(b.value)}{b.note ? ` ${b.note}` : ''}
            </text>
          </g>
        );
      })}
    </>
  );
}

/** Vertical bars, optionally grouped (several series per category). */
export function VBarSvg({
  categories, series, yLabel, xLabel, height = 300, valueFormat = (v: number) => String(v), yDomain,
}: {
  categories: string[]; series: { name: string; color: string; values: number[] }[]; yLabel: string; xLabel?: string;
  height?: number; valueFormat?: (v: number) => string; yDomain?: [number, number];
}) {
  const m = { t: 22, r: 16, b: 46, l: 56 };
  const x = scaleBand().domain(categories).range([m.l, W - m.r]).padding(0.25);
  const inner = scaleBand().domain(series.map((s) => s.name)).range([0, x.bandwidth()]).padding(0.08);
  const max = Math.max(...series.flatMap((s) => s.values));
  const y = scaleLinear().domain(yDomain ?? [0, max * 1.12]).nice().range([height - m.b, m.t]);
  return (
    <>
      <AxisLeft scale={y} x={m.l} label={yLabel} grid={W - m.l - m.r} />
      {series.map((s) =>
        categories.map((c, i) => {
          const bx = (x(c) ?? 0) + (inner(s.name) ?? 0);
          const v = s.values[i];
          return (
            <g key={`${s.name}-${c}`}>
              <rect x={bx} width={inner.bandwidth()} y={y(v)} height={y(0) - y(v)} rx={3} fill={s.color}>
                <title>{`${c}${series.length > 1 ? ` · ${s.name}` : ''}: ${valueFormat(v)}`}</title>
              </rect>
              {inner.bandwidth() > 22 && (
                <text x={bx + inner.bandwidth() / 2} y={y(v) - 5} textAnchor="middle" className="mono" style={{ fontSize: 10.5, fill: 'var(--ink)', fontWeight: 600 }}>
                  {valueFormat(v)}
                </text>
              )}
            </g>
          );
        }),
      )}
      <BandAxisBottom scale={x} y={height - m.b} label={xLabel} width={W} />
    </>
  );
}

export function PieSvg({ slices, size = 320 }: { slices: { label: string; value: number; color?: string }[]; size?: number }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - 10;
  const arcs = pie<{ label: string; value: number; color?: string }>().value((d) => d.value).sort(null)(slices);
  const a = arc<(typeof arcs)[number]>().innerRadius(r * 0.52).outerRadius(r).padAngle(0.012).cornerRadius(3);
  const labelArc = arc<(typeof arcs)[number]>().innerRadius(r * 0.78).outerRadius(r * 0.78);
  return (
    <g transform={`translate(${W / 2},${size / 2})`}>
      {arcs.map((d, i) => {
        const [lx, ly] = labelArc.centroid(d);
        const share = d.data.value / total;
        return (
          <g key={d.data.label}>
            <path d={a(d) ?? ''} fill={d.data.color ?? PALETTE[i % PALETTE.length]} stroke="var(--surface)" strokeWidth={2}>
              <title>{`${d.data.label}: ${d.data.value} (${(share * 100).toFixed(1)}%)`}</title>
            </path>
            {share > 0.05 && (
              <text x={lx} y={ly} textAnchor="middle" dy="0.32em" className="mono" style={{ fontSize: 11.5, fill: '#fff', fontWeight: 700 }}>
                {(share * 100).toFixed(1)}%
              </text>
            )}
          </g>
        );
      })}
      <text textAnchor="middle" dy="-0.2em" style={{ fontSize: 26, fontWeight: 800, fill: 'var(--ink)' }}>{total}</text>
      <text textAnchor="middle" dy="1.4em" style={{ fontSize: 11, fill: 'var(--muted)' }}>n</text>
    </g>
  );
}

export interface Pt {
  x: number;
  y: number;
  color?: string;
  key?: string | number;
}

/** Deterministic jitter so the picture is stable between renders. */
export function jitter(i: number, amount: number): number {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (s - Math.floor(s) - 0.5) * 2 * amount;
}

export function ScatterSvg({
  points, xLabel, yLabel, height = 340, xDomain, yDomain, fit, jitterAmount = 0.25, color = 'var(--violet)', radius = 3.2,
}: {
  points: Pt[]; xLabel: string; yLabel: string; height?: number; xDomain?: [number, number]; yDomain?: [number, number];
  fit?: { a: number; b: number }; jitterAmount?: number; color?: string; radius?: number;
}) {
  const m = { t: 16, r: 16, b: 46, l: 56 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = scaleLinear().domain(xDomain ?? [Math.min(...xs), Math.max(...xs)]).nice().range([m.l, W - m.r]);
  const y = scaleLinear().domain(yDomain ?? [Math.min(...ys), Math.max(...ys)]).nice().range([height - m.b, m.t]);
  const [dx0, dx1] = x.domain();
  return (
    <>
      <AxisLeft scale={y} x={m.l} label={yLabel} grid={W - m.l - m.r} />
      <AxisBottom scale={x} y={height - m.b} label={xLabel} width={W} />
      <g>
        {points.map((p, i) => (
          <circle key={p.key ?? i} cx={x(p.x + jitter(i, jitterAmount))} cy={y(p.y + jitter(i + 7919, jitterAmount))} r={radius}
            fill={p.color ?? color} fillOpacity={0.5} />
        ))}
      </g>
      {fit && (
        <line x1={x(dx0)} y1={y(fit.a + fit.b * dx0)} x2={x(dx1)} y2={y(fit.a + fit.b * dx1)} stroke="var(--ink)" strokeWidth={2.2} />
      )}
    </>
  );
}

export function LineSvg({
  series, xLabel, yLabel, height = 320, xDomain = [0, 1], yDomain = [0, 1], diagonal, marker,
}: {
  series: { name: string; color: string; points: [number, number][] }[]; xLabel: string; yLabel: string; height?: number;
  xDomain?: [number, number]; yDomain?: [number, number]; diagonal?: boolean; marker?: [number, number];
}) {
  const m = { t: 16, r: 16, b: 46, l: 56 };
  const x = scaleLinear().domain(xDomain).range([m.l, W - m.r]);
  const y = scaleLinear().domain(yDomain).range([height - m.b, m.t]);
  const ln = line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1]));
  return (
    <>
      <AxisLeft scale={y} x={m.l} label={yLabel} grid={W - m.l - m.r} />
      <AxisBottom scale={x} y={height - m.b} label={xLabel} width={W} />
      {diagonal && <line x1={x(xDomain[0])} y1={y(yDomain[0])} x2={x(xDomain[1])} y2={y(yDomain[1])} stroke="var(--muted)" strokeDasharray="4 4" />}
      {series.map((s) => (
        <path key={s.name} d={ln(s.points) ?? ''} fill="none" stroke={s.color} strokeWidth={2.5} />
      ))}
      {marker && <circle cx={x(marker[0])} cy={y(marker[1])} r={6} fill="var(--coral)" stroke="var(--surface)" strokeWidth={2} />}
    </>
  );
}

/** Correlation heat-map (diverging coral–surface–teal). */
export function HeatmapSvg({
  vars, matrix, selected, onSelect, size = 640,
}: { vars: string[]; matrix: number[][]; selected?: [number, number] | null; onSelect?: (i: number, j: number) => void; size?: number }) {
  const m = { t: 8, r: 8, b: 74, l: 74 };
  const n = vars.length;
  const cell = (size - m.l - m.r) / n;
  const color = (r: number) => {
    const a = Math.min(1, Math.abs(r));
    return r >= 0
      ? `color-mix(in srgb, var(--teal) ${Math.round(a * 100)}%, var(--surface))`
      : `color-mix(in srgb, var(--coral) ${Math.round(a * 100)}%, var(--surface))`;
  };
  return (
    <>
      {vars.map((v, i) => (
        <g key={v}>
          <text x={m.l - 6} y={m.t + i * cell + cell / 2} dy="0.32em" textAnchor="end" style={{ fontSize: 11, fill: 'var(--ink)' }}>{v}</text>
          <text transform={`translate(${m.l + i * cell + cell / 2},${m.t + n * cell + 8}) rotate(-50)`} textAnchor="end" dy="0.32em" style={{ fontSize: 11, fill: 'var(--ink)' }}>{v}</text>
        </g>
      ))}
      {matrix.map((row, i) =>
        row.map((r, j) => {
          const sel = selected && selected[0] === i && selected[1] === j;
          return (
            <g key={`${i}-${j}`}>
              <rect
                x={m.l + j * cell + 0.5}
                y={m.t + i * cell + 0.5}
                width={cell - 1}
                height={cell - 1}
                rx={3}
                fill={color(r)}
                stroke={sel ? 'var(--ink)' : 'none'}
                strokeWidth={sel ? 2 : 0}
                style={{ cursor: onSelect && i !== j ? 'pointer' : undefined }}
                onClick={onSelect && i !== j ? () => onSelect(i, j) : undefined}
              >
                <title>{`${vars[i]} × ${vars[j]}: r = ${r.toFixed(3)}`}</title>
              </rect>
              {cell > 26 && (
                <text x={m.l + j * cell + cell / 2} y={m.t + i * cell + cell / 2} dy="0.32em" textAnchor="middle" className="mono"
                  style={{ fontSize: 9, fill: Math.abs(r) > 0.55 ? '#fff' : 'var(--ink)', pointerEvents: 'none' }}>
                  {i === j ? '' : r.toFixed(2).replace('0.', '.')}
                </text>
              )}
            </g>
          );
        }),
      )}
    </>
  );
}

/** Tiny frequency sparkline for the column dictionary. */
export function Sparkline({ counts, color = 'var(--teal)' }: { counts: number[]; color?: string }) {
  const w = 96;
  const h = 26;
  const max = Math.max(...counts, 1);
  const bw = w / counts.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden className="block">
      {counts.map((c, i) => (
        <rect key={i} x={i * bw + 0.5} width={Math.max(1, bw - 1)} y={h - (c / max) * h} height={(c / max) * h} fill={color} rx={1} />
      ))}
    </svg>
  );
}
