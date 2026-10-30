import { useEffect, useState } from 'react';
import { ChartFrame } from '../components/charts/ChartFrame';
import { ScatterSvg, VBarSvg } from '../components/charts/Charts';
import { PageHeader } from '../components/ui';
import { SQL_PRESETS } from '../content/sqlPresets';
import { buildClean, loadRaw, runQuery, type QueryResult } from '../data/db';
import { useLang } from '../i18n/lang';
import { ADDED_COLUMNS } from '../data/clean';
import { COLUMN_NAMES } from '../data/parse';
import { downloadText } from '../lib/download';
import { csvText } from '../state/analysis';
import { useDb } from '../state/useDb';

const MAX_ROWS = 500;
const CLEAN_COLS = COLUMN_NAMES.length + ADDED_COLUMNS.length;

function QuickChart({ res }: { res: QueryResult }) {
  const { L } = useLang();
  if (res.columns.length < 2 || res.values.length < 2) return null;
  const last = res.columns.length - 1;
  const numericCol = (j: number) => res.values.every((r) => typeof r[j] === 'number');
  if (!numericCol(last)) return null;
  if (res.values.length > 30 && numericCol(0)) {
    return (
      <div className="card"><ChartFrame title={L(`${res.columns[last]} against ${res.columns[0]}`, `${res.columns[last]} مقابل ${res.columns[0]}`)} desc={L('Scatter plot of the query result.', 'مخطط انتشار لنتيجة الاستعلام.')} width={640} height={320} download="sql-chart">
        <ScatterSvg points={res.values.map((r) => ({ x: Number(r[0]), y: Number(r[last]) }))} xLabel={res.columns[0]} yLabel={res.columns[last]} height={320} />
      </ChartFrame></div>
    );
  }
  if (res.values.length > 30) return null;
  const textCols = res.columns.map((_, j) => j).filter((j) => j < last && !numericCol(j));
  const labelCols = textCols.length ? textCols : [0];
  const labels = res.values.map((r) => labelCols.map((j) => String(r[j])).join(' · '));
  return (
    <div className="card"><ChartFrame title={L(`${res.columns[last]} by ${res.columns[0]}`, `${res.columns[last]} حسب ${res.columns[0]}`)} desc={L('Bar chart of the last numeric column of the result.', 'مخطط أعمدة لآخر عمود رقمي في النتيجة.')} width={640} height={300} download="sql-chart">
      <VBarSvg categories={labels} series={[{ name: res.columns[last], color: 'var(--teal)', values: res.values.map((r) => Number(r[last])) }]} yLabel={res.columns[last]} height={300} valueFormat={(v) => String(Math.round(v * 100) / 100)} />
    </ChartFrame></div>
  );
}

export default function Sql() {
  const { L, lang } = useLang();
  const { db, error } = useDb();
  const [sql, setSql] = useState(SQL_PRESETS[0].sql);
  const [res, setRes] = useState<QueryResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ms, setMs] = useState(0);

  const run = (text = sql) => {
    if (!db) return;
    const t0 = performance.now();
    try {
      setRes(runQuery(db, text));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRes(null);
    }
    setMs(performance.now() - t0);
  };
  useEffect(() => {
    if (db) run(SQL_PRESETS[0].sql);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run the first preset once the database is ready
  }, [db]);

  const toCsv = (r: QueryResult) => [r.columns.join(','), ...r.values.map((v) => v.map((c) => (typeof c === 'string' && /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : String(c))).join(','))].join('\n');

  return (
    <div>
      <PageHeader
        eyebrow={L('Tool · SQLite in the browser', 'أداة · SQLite داخل المتصفح')}
        title={L('SQL console', 'وحدة SQL')}
        lead={L(
          `Query students_raw (the CSV as imported) and students_clean (${CLEAN_COLS} columns after cleaning) with real SQLite running in WebAssembly. Press Ctrl + Enter to run.`,
          `استعلم عن students_raw (ملف CSV كما استُورد) وstudents_clean (${CLEAN_COLS} عمودًا بعد التنظيف) باستخدام SQLite حقيقي يعمل عبر WebAssembly. اضغط Ctrl + Enter للتشغيل.`,
        )}
      />
      {error && <p className="mb-4 text-coral">{L('Could not start SQLite: ', 'تعذّر تشغيل SQLite: ')}{error}</p>}
      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <div>
          <p className="eyebrow mb-3">{L('Presets', 'استعلامات جاهزة')}</p>
          <ul className="flex flex-wrap gap-2 xl:flex-col">
            {SQL_PRESETS.map((p) => (
              <li key={p.en}>
                <button type="button" className={`w-full rounded-lg border px-3 py-2 text-start text-sm ${sql === p.sql ? 'border-teal bg-tint text-ink' : 'border-line bg-surface text-muted hover:text-ink'}`} onClick={() => { setSql(p.sql); run(p.sql); }}>
                  {lang === 'ar' ? p.ar : p.en}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 space-y-4">
          <label className="block">
            <span className="sr-only">{L('SQL query', 'استعلام SQL')}</span>
            <textarea
              dir="ltr"
              spellCheck={false}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } }}
              rows={8}
              className="mono w-full rounded-xl border border-line bg-[#1a2338] p-4 text-[13px] leading-relaxed text-[#d7dff0]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={() => run()} disabled={!db}>{db ? L('Run query', 'تشغيل الاستعلام') : L('Starting SQLite…', 'جارٍ تشغيل SQLite…')}</button>
            <button type="button" className="btn-ghost" disabled={!db} onClick={() => { if (db) { loadRaw(db, csvText); buildClean(db, csvText); run(); } }}>{L('Reset tables', 'إعادة ضبط الجداول')}</button>
            {res && <button type="button" className="btn-ghost" onClick={() => downloadText(toCsv(res), 'query.csv', 'text/csv')}>{L('Download CSV', 'تنزيل CSV')}</button>}
            {res && <span className="mono text-sm text-muted">{L(`${res.values.length} rows · ${ms.toFixed(1)} ms`, `${res.values.length} صفًا · ${ms.toFixed(1)} ملّي ثانية`)}</span>}
          </div>
          {err && <p role="alert" className="mono rounded-lg bg-coral-tint p-3 text-sm text-coral" dir="ltr">{err}</p>}
          {res && (
            <div className="card overflow-x-auto p-0 sm:p-0" dir="ltr">
              {res.columns.length === 0 ? (
                <p className="p-4 text-sm text-muted">{L('Statement executed (no rows returned).', 'نُفّذ الأمر (لا توجد صفوف).')}</p>
              ) : (
                <table className="tbl mono text-xs">
                  <thead><tr>{res.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>{res.values.slice(0, MAX_ROWS).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="whitespace-nowrap">{v === null ? 'NULL' : typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(4) : String(v)}</td>)}</tr>)}</tbody>
                </table>
              )}
              {res.values.length > MAX_ROWS && <p className="p-3 text-xs text-muted">{L(`Showing the first ${MAX_ROWS} rows.`, `تُعرض أول ${MAX_ROWS} صفًا.`)}</p>}
            </div>
          )}
          {res && <QuickChart res={res} />}
        </div>
      </div>
    </div>
  );
}
