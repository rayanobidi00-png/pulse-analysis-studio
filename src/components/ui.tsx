import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLang } from '../i18n/lang';
import { highlight } from '../lib/highlight';
import { STAGES } from '../content/stages';
import { Icon } from './Icon';

export function PageHeader({
  step,
  eyebrow,
  title,
  lead,
}: {
  step?: number;
  eyebrow: string;
  title: string;
  lead: string;
}) {
  const { L } = useLang();
  return (
    <header className="mb-12">
      <nav
        aria-label={L('Breadcrumb', 'مسار الصفحة')}
        className="flex flex-wrap items-center gap-2 text-[13px] text-muted"
      >
        <Link to="/" className="hover:text-ink hover:underline">
          {L('Overview', 'نظرة عامة')}
        </Link>
        <span aria-hidden>/</span>
        {step !== undefined && (
          <>
            <span>{L('Analysis', 'التحليل')}</span>
            <span aria-hidden>/</span>
          </>
        )}
        <span className="text-ink">{eyebrow}</span>
      </nav>
      {step !== undefined && (
        <p className="eyebrow mt-8">{L(`Chapter ${step} of 8`, `الفصل ${step} من 8`)}</p>
      )}
      <h1
        className={`${step !== undefined ? 'mt-2' : 'mt-8'} max-w-4xl text-[34px] leading-[1.12] sm:text-[46px]`}
      >
        {title}
      </h1>
      <p className="lede mt-4 max-w-3xl">{lead}</p>
    </header>
  );
}

export function Section({
  title,
  lead,
  children,
  id,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="section-block">
      <h2 className="text-[26px] leading-tight sm:text-[30px]">{title}</h2>
      {lead && <p className="mt-2 max-w-3xl text-[15.5px] leading-relaxed text-muted">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Kpi({
  value,
  label,
  tone = 'ink',
}: {
  value: string;
  label: string;
  tone?: 'ink' | 'teal' | 'coral';
}) {
  const color = tone === 'teal' ? 'text-teal' : tone === 'coral' ? 'text-coral' : 'text-ink';
  return (
    <div className="bg-surface px-5 py-5">
      <b className={`stat-big block text-[30px] sm:text-[36px] ${color}`}>{value}</b>
      <span className="mt-2 block text-[13px] text-muted">{label}</span>
    </div>
  );
}

export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
      {children}
    </div>
  );
}

export interface CodeTab {
  label: string;
  lang: 'r' | 'sql' | 'ts';
  code: string;
}

export function CodeTabs({ tabs, initial = 0 }: { tabs: CodeTab[]; initial?: number }) {
  const [i, setI] = useState(initial);
  const [copied, setCopied] = useState(false);
  const { L } = useLang();
  const tab = tabs[i];
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-line" dir="ltr">
      <div className="flex items-center gap-1 bg-code px-2 pt-2">
        <div role="tablist" className="flex items-center gap-1">
          {tabs.map((t, k) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={k === i}
              onClick={() => setI(k)}
              className={`mono rounded-t-md px-3 py-1.5 text-xs ${k === i ? 'bg-[#1a2338] text-white' : 'text-[#9aa6bf] hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mono ms-auto px-2 py-1 text-xs text-[#9aa6bf] hover:text-white"
          onClick={() => {
            void navigator.clipboard?.writeText(tab.code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            });
          }}
        >
          {copied ? L('Copied', 'تم النسخ') : L('Copy', 'نسخ')}
        </button>
      </div>
      <pre
        className="mono max-h-[420px] overflow-auto bg-[#1a2338] p-4 text-[12.5px] leading-relaxed text-[#d7dff0]"
        tabIndex={0}
      >
        <code dangerouslySetInnerHTML={{ __html: highlight(tab.code, tab.lang) }} />
      </pre>
    </div>
  );
}

export function NextStep({ to, label }: { to: string; label: string }) {
  const { L } = useLang();
  const { pathname } = useLocation();
  const i = STAGES.findIndex((st) => st.path === pathname);
  const prev = i > 0 ? STAGES[i - 1] : undefined;
  return (
    <nav
      aria-label={L('Chapters', 'الفصول')}
      className="no-print mt-20 grid gap-4 border-t border-line pt-8 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          to={prev.path}
          className="group rounded-card border border-line p-5 hover:border-[color-mix(in_srgb,var(--ink)_35%,var(--line))]"
        >
          <span className="flex items-center gap-1.5 text-[13px] text-muted">
            <Icon name="back" className="h-3.5 w-3.5" />
            {L('Previous chapter', 'الفصل السابق')}
          </span>
          <span className="serif mt-1 block text-[22px] font-semibold group-hover:underline">
            {L(prev.en, prev.ar)}
          </span>
        </Link>
      ) : (
        <span />
      )}
      <Link
        to={to}
        className="group rounded-card border border-line p-5 text-end hover:border-[color-mix(in_srgb,var(--ink)_35%,var(--line))]"
      >
        <span className="flex items-center justify-end gap-1.5 text-[13px] text-muted">
          {L('Next chapter', 'الفصل التالي')}
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </span>
        <span className="serif mt-1 block text-[22px] font-semibold group-hover:underline">{label}</span>
      </Link>
    </nav>
  );
}

export function Select<V extends string>({
  label,
  value,
  options,
  onChange,
  id,
}: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  id?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted">
      {label}
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value as V)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v: number) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted">
      <span className="flex justify-between gap-2">
        {label} <b className="mono text-ink">{format(value)}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--teal)]"
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[var(--teal)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function Verdict({ significant, children }: { significant: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${significant ? 'bg-tint text-teal' : 'bg-soft text-muted'}`}
    >
      <span aria-hidden>{significant ? '●' : '○'}</span>
      {children}
    </span>
  );
}

export function Interp({ children }: { children: ReactNode }) {
  const { L } = useLang();
  return (
    <div className="border-s-[3px] border-teal bg-band px-5 py-4 text-[15px] leading-relaxed">
      <p className="mb-1 text-[13px] font-semibold text-teal">{L('Interpretation', 'التفسير')}</p>
      {children}
    </div>
  );
}

export function Caveat({ children }: { children: ReactNode }) {
  const { L } = useLang();
  return (
    <div className="border-s-[3px] border-amber bg-[color-mix(in_srgb,var(--amber)_7%,var(--paper))] px-5 py-4 text-[15px] leading-relaxed">
      <p className="mb-1 text-[13px] font-semibold text-amber">{L('Be careful', 'تنبيه')}</p>
      {children}
    </div>
  );
}

export function SimpleTable({
  head,
  rows,
  numeric = [],
}: {
  head: string[];
  rows: (string | number)[][];
  numeric?: number[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={numeric.includes(j) ? 'mono num ltr whitespace-nowrap' : ''}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3.5 py-2.5">
      <div className="text-[12px] font-medium text-muted">{label}</div>
      <div className="mono num mt-0.5 text-[18px] font-semibold ltr">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
