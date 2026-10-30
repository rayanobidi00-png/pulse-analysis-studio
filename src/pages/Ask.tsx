import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ChartFrame, LegendItem, PALETTE } from '../components/charts/ChartFrame';
import { BoxPlotSvg, HistogramSvg, PieSvg, ScatterSvg, VBarSvg } from '../components/charts/Charts';
import { CodeTabs, PageHeader, SimpleTable } from '../components/ui';
import { answer, EXAMPLES, parseRequest, type Answer, type ChartSpec } from '../assistant/engine';
import { runQuery } from '../data/db';
import { fmt } from '../lib/format';
import { useLang } from '../i18n/lang';
import { useAnalysis } from '../state/analysis';
import { useDb } from '../state/useDb';

interface Turn {
  id: number;
  q: string;
  a: Answer;
  sql?: { columns: string[]; rows: (string | number)[][]; error?: string };
}

function ChartView({ c, title }: { c: ChartSpec; title: string }) {
  const { L } = useLang();
  if (c.kind === 'histogram')
    return (
      <ChartFrame title={title} desc={title} width={640} height={300} download="pulse-ask">
        <HistogramSvg
          values={c.values}
          xLabel={c.label}
          yLabel={L('Students', 'الطلاب')}
          colorFn={c.label.includes('G3') || c.label === 'final grade (G3)' ? (b) => (b >= 10 ? 'var(--teal)' : 'var(--coral)') : undefined}
          markers={(c.markers ?? []).map((m, i) => ({ ...m, color: i === 0 ? 'var(--ink)' : 'var(--coral)', dashed: true }))}
        />
      </ChartFrame>
    );
  if (c.kind === 'box')
    return (
      <ChartFrame title={title} desc={title} width={640} height={320} download="pulse-ask">
        <BoxPlotSvg groups={c.groups} xLabel={c.xLabel} yLabel={c.yLabel} />
      </ChartFrame>
    );
  if (c.kind === 'bar')
    return (
      <ChartFrame title={title} desc={title} width={640} height={300} download="pulse-ask">
        <VBarSvg
          categories={c.bars.map((b) => b.label)}
          series={[{ name: c.yLabel, color: 'var(--teal)', values: c.bars.map((b) => b.value) }]}
          yLabel={c.yLabel}
          yDomain={c.percent ? [0, 100] : undefined}
          valueFormat={(v) => (Number.isInteger(v) ? String(v) : fmt(v, c.percent ? 1 : 2))}
        />
      </ChartFrame>
    );
  if (c.kind === 'pie')
    return (
      <ChartFrame
        title={title}
        desc={title}
        width={640}
        height={320}
        download="pulse-ask"
        legend={c.slices.map((s, i) => <LegendItem key={s.label} color={PALETTE[i % PALETTE.length]} label={`${s.label} (${s.value})`} />)}
      >
        <PieSvg slices={c.slices} />
      </ChartFrame>
    );
  return (
    <ChartFrame
      title={title}
      desc={title}
      width={640}
      height={340}
      download="pulse-ask"
      legend={<><LegendItem color="var(--teal)" label={L('pass', 'ناجح')} /><LegendItem color="var(--coral)" label={L('fail', 'راسب')} /></>}
    >
      <ScatterSvg
        points={c.points.map((p) => ({ x: p.x, y: p.y, color: p.fail ? 'var(--coral)' : 'var(--teal)' }))}
        xLabel={c.xLabel}
        yLabel={c.yLabel}
        fit={c.fit}
      />
    </ChartFrame>
  );
}

function AnswerCard({ t }: { t: Turn }) {
  const { L, lang } = useLang();
  const a = t.a;
  const pick = (b: { en: string; ar: string }) => (lang === 'ar' ? b.ar : b.en);
  return (
    <article className="fade-up space-y-4">
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-ee-md bg-[var(--navy)] px-4 py-2.5 text-[15px] text-white shadow-card" dir="auto">
          {t.q}
        </p>
      </div>
      <div className="card">
        <div className="flex items-start gap-3">
          <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${a.ok ? 'bg-tint text-teal' : 'bg-soft text-amber'}`}>
            {a.ok ? '✓' : '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {L('Understood as', 'فهمت طلبك كـ')}:{' '}
              <bdi dir="ltr">
                <span className="text-teal">{a.parsed.intent}</span>
                {a.parsed.vars.length > 0 && ` · ${a.parsed.vars.join(', ')}`}
                {a.parsed.filters.length > 0 && ` · ${a.parsed.filters.map((f) => `${f.col}=${f.value}`).join(', ')}`}
              </bdi>
            </p>
            <h2 className="mt-1 text-[21px] font-bold leading-snug">{pick(a.title)}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">{pick(a.summary)}</p>
          </div>
        </div>
        {a.stats && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {a.stats.map((s) => (
              <div key={s.label.en} className="rounded-xl border border-line bg-soft px-3.5 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{pick(s.label)}</div>
                <div className="mono num mt-0.5 text-[17px] font-semibold ltr">{s.value}</div>
              </div>
            ))}
          </div>
        )}
        {(a.chart || a.table || t.sql) && (
          <div className={`mt-6 grid gap-6 ${a.chart && (a.table || a.r) ? 'xl:grid-cols-[1.3fr_1fr]' : ''}`}>
            {a.chart && <ChartView c={a.chart} title={pick(a.title)} />}
            <div className="min-w-0 space-y-4">
              {a.table && (
                <div className="max-h-[360px] overflow-auto rounded-xl border border-line">
                  <SimpleTable head={a.table.head} rows={a.table.rows} numeric={a.table.head.map((_, i) => i).filter((i) => i > 0)} />
                </div>
              )}
              {t.sql && (
                t.sql.error ? (
                  <p className="rounded-xl bg-[color-mix(in_srgb,var(--coral)_10%,var(--surface))] px-4 py-3 text-sm text-coral">{t.sql.error}</p>
                ) : (
                  <div className="max-h-[420px] overflow-auto rounded-xl border border-line">
                    <SimpleTable head={t.sql.columns} rows={t.sql.rows.slice(0, 200)} />
                  </div>
                )
              )}
              {a.r && <CodeTabs tabs={[{ label: L('R code (same result)', 'كود R (نفس النتيجة)'), lang: 'r', code: a.r }]} />}
            </div>
          </div>
        )}
        {!a.chart && !a.table && !t.sql && a.r && (
          <div className="mt-5">
            <CodeTabs tabs={[{ label: L('R code (same result)', 'كود R (نفس النتيجة)'), lang: 'r', code: a.r }]} />
          </div>
        )}
      </div>
    </article>
  );
}

export default function Ask() {
  const { L, lang } = useLang();
  const A = useAnalysis();
  const { db } = useDb();
  const [q, setQ] = useState('');
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const run = useMemo(
    () => (text: string): Turn => {
      const p = parseRequest(text);
      const a = answer(A.raw, p);
      const turn: Turn = { id: idRef.current++, q: text, a };
      if (p.intent === 'sql') {
        if (!db) turn.sql = { columns: [], rows: [], error: L('SQLite is still starting. Try again in a second.', 'قاعدة SQLite لسا بتشتغل. جرّب كمان ثانية.') };
        else {
          try {
            const r = runQuery(db, p.sql ?? '');
            turn.sql = { columns: r.columns, rows: r.values.map((row) => row.map((v) => (v === null ? 'NA' : typeof v === 'number' ? v : String(v)))) };
            turn.a = { ...a, summary: { en: `${r.values.length} rows returned.`, ar: `رجع ${r.values.length} صف.` } };
          } catch (e) {
            turn.sql = { columns: [], rows: [], error: e instanceof Error ? e.message : String(e) };
          }
        }
      }
      return turn;
    },
    [A.raw, db, L],
  );
  // Open with one worked example so the page shows what it does.
  const [turns, setTurns] = useState<Turn[]>(() => [
    (() => {
      const text = lang === 'ar' ? 'هل الجنس بأثر على العلامة النهائية؟' : 'Does sex affect the final grade?';
      const p = parseRequest(text);
      return { id: 0, q: text, a: answer(A.raw, p) };
    })(),
  ]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [turns.length]);

  const submit = (text: string) => {
    const s = text.trim();
    if (!s) return;
    setTurns((t) => [...t, run(s)]);
    setQ('');
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(q);
  };

  return (
    <div>
      <PageHeader
        eyebrow={L('Ask PULSE · analysis assistant', 'اسأل PULSE · مساعد التحليل')}
        title={L('Ask for any analysis. It runs it.', 'اطلب أي تحليل، وهو بنفّذه.')}
        lead={L(
          'Type a request in English or Arabic: clean the data, describe a column, draw a chart, compare groups, test a relationship, fit a regression, count with filters, or run SQL. Every answer is computed live on the 649 students and comes with its R code.',
          'اكتب طلبك بالعربي أو بالإنجليزي: نظّف البيانات، صف عمود، ارسم رسمة، قارن مجموعات، اختبر علاقة، اعمل انحدار، احسب عدد مع شروط، أو شغّل SQL. كل جواب بينحسب مباشرة على الـ 649 طالب ومعه كود R.',
        )}
      />

      <div className="space-y-8">
        {turns.map((t) => (
          <AnswerCard key={t.id} t={t} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="no-print sticky bottom-4 z-20 mt-10">
        <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-surface p-3 shadow-[0_24px_60px_-24px_rgba(11,18,34,.45)]">
          <label htmlFor="ask-input" className="sr-only">{L('Your request', 'طلبك')}</label>
          <div className="flex gap-2">
            <input
              id="ask-input"
              dir="auto"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={L('e.g. compare final grade by school', 'مثلًا: قارن العلامة النهائية حسب المدرسة')}
              className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 text-[15px] text-ink outline-none focus:border-teal"
              autoComplete="off"
            />
            <button type="submit" className="btn-primary h-12 px-5" disabled={!q.trim()}>
              {L('Run', 'نفّذ')}
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {EXAMPLES.map((ex) => (
              <button key={ex.en} type="button" className="chip shrink-0 whitespace-nowrap hover:border-teal hover:text-ink" onClick={() => submit(lang === 'ar' ? ex.ar : ex.en)}>
                {lang === 'ar' ? ex.ar : ex.en}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
