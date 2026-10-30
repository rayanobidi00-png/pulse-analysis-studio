import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
  const prev = step ? STAGES[step - 2] : undefined;
  const next = step ? STAGES[step] : undefined;
  return (
    <header className="hero-banner mb-8">
      <div className="relative z-10 px-6 py-7 sm:px-9 sm:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label={L('Breadcrumb', 'مسار الصفحة')}
            className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#98a3ba]"
          >
            <Link to="/" className="hover:text-white">
              {L('Dashboard', 'لوحة التحكم')}
            </Link>
            <span aria-hidden>/</span>
            {step !== undefined ? (
              <span className="mono rounded-full bg-[#2ec4ae] px-2.5 py-0.5 text-[11px] font-bold tracking-[0.08em] text-[#05201b] ltr">
                {L('STAGE', 'المرحلة')} {String(step).padStart(2, '0')}/08
              </span>
            ) : null}
            <span className="font-medium text-[#c9d2e3]">{eyebrow}</span>
          </nav>
          {step !== undefined && (
            <div className="no-print flex items-center gap-2">
              {prev && (
                <Link
                  to={prev.path}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-[13px] font-semibold text-[#c9d2e3] hover:bg-white/10"
                >
                  <Icon name="back" className="h-3.5 w-3.5" />
                  {L(prev.en, prev.ar)}
                </Link>
              )}
              {next && (
                <Link
                  to={next.path}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[13px] font-semibold text-white hover:bg-white/20"
                >
                  {L(next.en, next.ar)}
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </div>
        <h1 className="mt-5 max-w-4xl text-[30px] font-extrabold leading-[1.06] tracking-[-0.03em] text-white sm:text-[44px]">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[#b8c2d6] sm:text-[16.5px]">{lead}</p>
        {step !== undefined && (
          <div className="mt-6 flex gap-1.5" aria-hidden>
            {STAGES.map((s, i) => (
              <span
                key={s.path}
                className={`h-1.5 flex-1 rounded-full ${i + 1 < step ? 'bg-[#2ec4ae]/50' : i + 1 === step ? 'bg-[#2ec4ae]' : 'bg-white/10'}`}
              />
            ))}
          </div>
        )}
      </div>
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
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-2.5 h-5 w-1.5 shrink-0 rounded-full bg-teal" />
        <div className="min-w-0">
          <h2 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[30px]">
            {title}
          </h2>
          {lead && <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{lead}</p>}
        </div>
      </div>
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
    <div className="bg-surface px-5 py-4">
      <b
        className={`block font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] num sm:text-[34px] ${color}`}
      >
        {value}
      </b>
      <span className="mt-1.5 block text-xs text-muted sm:text-[13px]">{label}</span>
    </div>
  );
}

export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card sm:grid-cols-3 lg:grid-cols-6">
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
    <div className="min-w-0 overflow-hidden rounded-xl border border-line" dir="ltr">
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
  const { L, dir } = useLang();
  return (
    <div className="no-print mt-16">
      <Link
        to={to}
        className="group flex items-center justify-between gap-6 overflow-hidden rounded-2xl bg-[var(--navy)] px-6 py-6 text-white shadow-[0_20px_50px_-20px_rgba(11,18,34,.6)] transition-transform hover:-translate-y-0.5 sm:px-8"
      >
        <span>
          <span className="mono block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#2ec4ae]">
            {L('Next step', 'الخطوة التالية')}
          </span>
          <span className="mt-1 block font-display text-[26px] font-extrabold tracking-[-0.02em] sm:text-[32px]">
            {label}
          </span>
        </span>
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#2ec4ae] text-xl text-[#06201c] transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
        >
          {dir === 'rtl' ? '←' : '→'}
        </span>
      </Link>
    </div>
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${significant ? 'bg-tint text-teal' : 'bg-soft text-muted'}`}
    >
      <span aria-hidden>{significant ? '●' : '○'}</span>
      {children}
    </span>
  );
}

export function Interp({ children }: { children: ReactNode }) {
  const { L } = useLang();
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--teal)_25%,var(--line))] bg-tint px-5 py-4 text-[14.5px] leading-relaxed">
      <span className="eyebrow mb-1.5 flex items-center gap-2">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-teal" />
        {L('Interpretation', 'التفسير')}
      </span>
      {children}
    </div>
  );
}

export function Caveat({ children }: { children: ReactNode }) {
  const { L } = useLang();
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--amber)_35%,var(--line))] bg-[color-mix(in_srgb,var(--amber)_8%,var(--surface))] px-5 py-4 text-[14.5px] leading-relaxed">
      <span className="mb-1.5 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-amber">
        {L('Be careful', 'تنبيه')}
      </span>
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
    <div className="rounded-xl border border-line bg-soft px-3.5 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mono num mt-0.5 text-[19px] font-semibold ltr">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
