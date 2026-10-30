import { useMemo, useRef, useState } from 'react';
import type { WebR } from 'webr';
import { CodeTabs, PageHeader } from '../components/ui';
import { COMPARE_ROWS, matches } from '../analysis/compare';
import { rSections } from '../content/rcode';
import { useLang } from '../i18n/lang';
import { fmt, fmtP } from '../lib/format';
import { adaptForWebR, hasPackage, readResultsJson, runR, startWebR, type RRun } from '../lib/webr';
import { csvText, useAnalysis } from '../state/analysis';
import exported from '../../data/results.json';

type Status = 'idle' | 'init' | 'packages' | 'ready' | 'error';

export default function RunR() {
  const A = useAnalysis();
  const { L } = useLang();
  const sections = useMemo(() => rSections(), []);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [runs, setRuns] = useState<Record<string, RRun>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [live, setLive] = useState<unknown | null>(null);
  const webR = useRef<WebR | null>(null);

  const start = async () => {
    setError(null);
    try {
      const w = await startWebR((m) => setStatus(m as Status), csvText);
      const miss: string[] = [];
      for (const p of ['modeest', 'corrplot']) if (!(await hasPackage(w, p))) miss.push(p);
      setMissing(miss);
      webR.current = w;
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runUpTo = async (idx: number) => {
    const w = webR.current;
    if (!w) return;
    const next = { ...runs };
    for (let k = 0; k <= idx; k++) {
      const s = sections[k];
      if (next[s.id] && k < idx) continue;
      setBusy(s.id);
      next[s.id] = await runR(w, adaptForWebR(s.code, missing));
      setRuns({ ...next });
      if (s.id === '7') setLive(await readResultsJson(w));
    }
    setBusy(null);
  };

  const ref = (live ?? exported) as Record<string, unknown>;
  const matched = COMPARE_ROWS.filter((r) => matches(r, r.r(ref), r.ts(A))).length;
  const statusText: Record<Status, string> = {
    idle: L('R is not loaded yet (about 30 MB the first time, then cached by the browser).', 'لم يُحمَّل R بعد (نحو 30 ميغابايت في المرة الأولى، ثم يحفظه المتصفح).'),
    init: L('Downloading and starting R (WebAssembly)…', 'جارٍ تنزيل R وتشغيله (WebAssembly)…'),
    packages: L('Installing dplyr, ggplot2, jsonlite, modeest, corrplot…', 'جارٍ تثبيت dplyr وggplot2 وjsonlite وmodeest وcorrplot…'),
    ready: L('R is ready. Run the script section by section.', 'R جاهز. شغّل السكربت قسمًا بعد قسم.'),
    error: L('R could not start in this browser.', 'تعذّر تشغيل R في هذا المتصفح.'),
  };

  return (
    <div>
      <PageHeader
        eyebrow={L('Tool · webR', 'أداة · webR')}
        title={L('Run it in R', 'شغّله في R')}
        lead={L(
          'The real R interpreter, compiled to WebAssembly, runs our course script pulse_analysis.R inside your browser: same code, same packages, same numbers. Nothing is installed on your computer.',
          'مفسّر R الحقيقي، مترجمًا إلى WebAssembly، يشغّل سكربت المقرر pulse_analysis.R داخل متصفحك: الكود نفسه، والحزم نفسها، والأرقام نفسها. لا يُثبَّت شيء على جهازك.',
        )}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <div className="card flex flex-wrap items-center gap-4">
            <button type="button" className="btn-primary" onClick={start} disabled={status === 'init' || status === 'packages' || status === 'ready'}>
              {status === 'ready' ? L('R is running', 'R يعمل') : L('Start R', 'شغّل R')}
            </button>
            <button type="button" className="btn-ghost" onClick={() => runUpTo(sections.length - 1)} disabled={status !== 'ready' || busy !== null}>
              {L('Run the whole script', 'تشغيل السكربت كاملًا')}
            </button>
            <p className="text-sm text-muted" role="status" aria-live="polite">
              {(status === 'init' || status === 'packages') && <span aria-hidden className="me-2 inline-block h-2 w-2 animate-pulse rounded-full bg-teal" />}
              {statusText[status]}
            </p>
            {error && <p role="alert" className="mono w-full rounded-lg bg-coral-tint p-3 text-xs text-coral" dir="ltr">{error}</p>}
            {missing.length > 0 && (
              <p className="w-full text-xs text-muted">
                {L(`Not available in the webR package repository: ${missing.join(', ')}. The script uses the base-R equivalent shown in the code (same results).`, `غير متوفرة في مستودع حزم webR: ${missing.join('، ')}. يستخدم السكربت البديل من R الأساسي الظاهر في الكود (النتائج نفسها).`)}
              </p>
            )}
          </div>
          {sections.map((s, i) => {
            const run = runs[s.id];
            return (
              <article key={s.id} className="card" aria-labelledby={`rs-${s.id}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id={`rs-${s.id}`} className="text-lg font-bold"><span className="mono me-2 text-teal">{s.id}</span>{L(s.en, s.ar)}</h2>
                  <button type="button" className={run ? 'btn-ghost' : 'btn-primary'} disabled={status !== 'ready' || busy !== null} onClick={() => runUpTo(i)}>
                    {busy === s.id ? L('Running…', 'جارٍ التشغيل…') : run ? L('Run again', 'تشغيل مجددًا') : L('Run section', 'تشغيل القسم')}
                  </button>
                </div>
                <div className="mt-4">
                  <CodeTabs tabs={[{ label: 'pulse_analysis.R', lang: 'r', code: s.code }, ...(status === 'ready' ? [{ label: L('as run in webR', 'كما يُشغَّل في webR'), lang: 'r' as const, code: adaptForWebR(s.code, missing) }] : [])]} />
                </div>
                {run && (
                  <div className="fade-up mt-4 space-y-3">
                    {run.error && <p role="alert" className="mono rounded-lg bg-coral-tint p-3 text-xs text-coral" dir="ltr">Error: {run.error}</p>}
                    {run.output.length > 0 && (
                      <pre className="mono max-h-96 overflow-auto rounded-lg border border-line bg-soft p-3 text-[11.5px] leading-snug" dir="ltr" tabIndex={0}>
                        {run.output.map((o, k) => <span key={k} className={o.type === 'stderr' ? 'text-amber' : ''}>{o.text}{'\n'}</span>)}
                      </pre>
                    )}
                    {run.images.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {run.images.map((src, k) => <img key={k} src={src} alt={L(`R plot ${k + 1} from section ${s.id}`, `رسم R رقم ${k + 1} من القسم ${s.id}`)} className="w-full rounded-lg border border-line bg-white" />)}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <aside className="min-w-0">
          <div className="card xl:sticky xl:top-20">
            <h2 className="text-lg font-bold">{L('R vs TypeScript', 'R مقابل TypeScript')}</h2>
            <p className="mt-1 text-xs text-muted">
              {live ? L('R column: computed by R in this browser (section 7).', 'عمود R: محسوب بواسطة R في هذا المتصفح (القسم 7).') : L('R column: data/results.json exported from RStudio. Run section 7 to recompute it here.', 'عمود R: ملف data/results.json المصدَّر من RStudio. شغّل القسم 7 لإعادة حسابه هنا.')}
            </p>
            <p className="mt-3 font-semibold text-teal">{L(`${matched} / ${COMPARE_ROWS.length} match`, `${matched} / ${COMPARE_ROWS.length} متطابقة`)}</p>
            <div className="relative mt-3 max-h-[70vh] overflow-auto">
              <table className="tbl text-xs">
                <thead><tr><th>{L('Quantity', 'المقدار')}</th><th>R</th><th>TS</th><th><span className="sr-only">{L('match', 'تطابق')}</span></th></tr></thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => {
                    const r = row.r(ref);
                    const t = row.ts(A);
                    const ok = matches(row, r, t);
                    const f = (v: number) => (row.isP ? fmtP(v) : fmt(v, row.digits));
                    return (
                      <tr key={row.label}>
                        <td className="mono" dir="ltr">{row.label}</td>
                        <td className="mono num whitespace-nowrap" dir="ltr">{f(r)}</td>
                        <td className="mono num whitespace-nowrap" dir="ltr">{f(t)}</td>
                        <td className={ok ? 'text-teal' : 'text-coral'} aria-label={ok ? L('match', 'متطابق') : L('mismatch', 'غير متطابق')}>{ok ? '✓' : '✗'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
