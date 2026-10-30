import { useId, useRef, type ReactNode } from 'react';
import { downloadPng, downloadSvg } from '../../lib/download';
import { useLang } from '../../i18n/lang';

export const PALETTE = ['var(--teal)', 'var(--sky)', 'var(--violet)', 'var(--amber)', 'var(--coral)', 'var(--muted)'];

interface Props {
  /** The finding, stated as a sentence (e.g. "Past failures cut the final grade by about 4 points"). */
  title: string;
  subtitle?: string;
  /** Text alternative read by screen readers. */
  desc: string;
  width: number;
  height: number;
  children: ReactNode;
  download?: string;
  legend?: ReactNode;
  className?: string;
}

export function ChartFrame({ title, subtitle, desc, width, height, children, download, legend, className }: Props) {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const { L } = useLang();
  return (
    <figure className={`min-w-0 ${className ?? ''}`}>
      <figcaption className="mb-2">
        <p className="font-display text-base font-bold leading-snug sm:text-lg">{title}</p>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </figcaption>
      {legend && <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">{legend}</div>}
      <div dir="ltr">
        <svg
          ref={ref}
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-labelledby={`${id}-t ${id}-d`}
          style={{ fontFamily: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif" }}
        >
          <title id={`${id}-t`}>{title}</title>
          <desc id={`${id}-d`}>{desc}</desc>
          {children}
        </svg>
      </div>
      {download && (
        <div className="no-print mt-2 flex gap-2">
          <button type="button" className="chip hover:text-ink" onClick={() => ref.current && downloadPng(ref.current, download)}>
            {L('Download PNG', 'تنزيل PNG')}
          </button>
          <button type="button" className="chip hover:text-ink" onClick={() => ref.current && downloadSvg(ref.current, download)}>
            {L('Download SVG', 'تنزيل SVG')}
          </button>
        </div>
      )}
    </figure>
  );
}

export function LegendItem({ color, label, shape = 'dot' }: { color: string; label: string; shape?: 'dot' | 'line' | 'square' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i
        aria-hidden
        className="inline-block"
        style={{
          background: shape === 'line' ? 'transparent' : color,
          borderTop: shape === 'line' ? `2px dashed ${color}` : undefined,
          width: shape === 'line' ? 16 : 10,
          height: shape === 'line' ? 0 : 10,
          borderRadius: shape === 'dot' ? 99 : 2,
        }}
      />
      {label}
    </span>
  );
}
