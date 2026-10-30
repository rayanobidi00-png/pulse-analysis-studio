import type { ScaleBand, ScaleLinear } from 'd3-scale';

const tickText = { fontSize: 12.5, fill: 'var(--muted)' } as const;

export function AxisBottom({
  scale, y, ticks = 6, label, width, format = (v: number) => String(v), grid = 0,
}: {
  scale: ScaleLinear<number, number>; y: number; ticks?: number; label?: string; width?: number;
  format?: (v: number) => string; grid?: number;
}) {
  const [r0, r1] = scale.range();
  return (
    <g>
      <line x1={r0} x2={r1} y1={y} y2={y} stroke="var(--line)" />
      {scale.ticks(ticks).map((t) => (
        <g key={t} transform={`translate(${scale(t)},${y})`}>
          {grid > 0 && <line y1={-grid} y2={0} stroke="var(--line)" strokeDasharray="2 3" />}
          <line y2={4} stroke="var(--line)" />
          <text y={16} textAnchor="middle" style={tickText}>{format(t)}</text>
        </g>
      ))}
      {label && (
        <text x={width ? (r0 + r1) / 2 : r1} y={y + 34} textAnchor="middle" style={{ fontSize: 13.5, fill: 'var(--muted)', fontWeight: 500 }}>
          {label}
        </text>
      )}
    </g>
  );
}

export function AxisLeft({
  scale, x, ticks = 5, label, format = (v: number) => String(v), grid = 0,
}: {
  scale: ScaleLinear<number, number>; x: number; ticks?: number; label?: string; format?: (v: number) => string; grid?: number;
}) {
  const [r0, r1] = scale.range();
  return (
    <g>
      {scale.ticks(ticks).map((t) => (
        <g key={t} transform={`translate(${x},${scale(t)})`}>
          {grid > 0 && <line x1={0} x2={grid} stroke="var(--line)" strokeDasharray="2 3" />}
          <text x={-8} dy="0.32em" textAnchor="end" style={tickText}>{format(t)}</text>
        </g>
      ))}
      {label && (
        <text transform={`translate(${x - 40},${(r0 + r1) / 2}) rotate(-90)`} textAnchor="middle" style={{ fontSize: 13.5, fill: 'var(--muted)', fontWeight: 500 }}>
          {label}
        </text>
      )}
    </g>
  );
}

export function BandAxisBottom({ scale, y, label, width }: { scale: ScaleBand<string>; y: number; label?: string; width: number }) {
  return (
    <g>
      <line x1={scale.range()[0]} x2={scale.range()[1]} y1={y} y2={y} stroke="var(--line)" />
      {scale.domain().map((d) => (
        <text key={d} x={(scale(d) ?? 0) + scale.bandwidth() / 2} y={y + 16} textAnchor="middle" style={tickText}>
          {d}
        </text>
      ))}
      {label && (
        <text x={width / 2} y={y + 34} textAnchor="middle" style={{ fontSize: 13.5, fill: 'var(--muted)', fontWeight: 500 }}>
          {label}
        </text>
      )}
    </g>
  );
}
