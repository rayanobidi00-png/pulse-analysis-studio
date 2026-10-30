import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ChartFrame, LegendItem, PALETTE } from '../components/charts/ChartFrame';
import { BoxPlotSvg, HistogramSvg, PieSvg, ScatterSvg, VBarSvg } from '../components/charts/Charts';
import { CodeTabs, PageHeader, SimpleTable } from '../components/ui';
import { answer, EXAMPLES, parseRequest, type Answer, type ChartSpec } from '../assistant/engine';
import { logRequest, recentRequests, supabaseConfigured, type LoggedRequest } from '../data/backend';
import { fmt } from '../lib/format';
import { useLang } from '../i18n/lang';
import { useAnalysis } from '../state/analysis';

interface Turn {
  id: number;
  q: string;
  a: Answer;
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
          colorFn={
            c.label.includes('G3') || c.label === 'final grade (G3)'
              ? (b) => (b >= 10 ? 'var(--teal)' : 'var(--coral)')
              : undefined
          }
          markers={(c.markers ?? []).map((m, i) => ({
            ...m,
            color: i === 0 ? 'var(--ink)' : 'var(--coral)',
            dashed: true,
          }))}
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
        legend={c.slices.map((s, i) => (
          <LegendItem key={s.label} color={PALETTE[i % PALETTE.length]} label={`${s.label} (${s.value})`} />
        ))}
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
      legend={
        <>
          <LegendItem color="var(--teal)" label={L('pass', 'ناجح')} />
          <LegendItem color="var(--coral)" label={L('fail', 'راسب')} />
        </>
      }
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
        <p
          className="max-w-[80%] rounded-2xl rounded-ee-md bg-[var(--navy)] px-4 py-2.5 text-[15px] text-white shadow-card"
          dir="auto"
        >
          {t.q}
        </p>
      </div>
      <div className="card">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${a.ok ? 'bg-tint text-teal' : 'bg-soft text-amber'}`}
          >
            {a.ok ? '✓' : '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {L('Understood as', 'فهمت طلبك كـ')}:{' '}
              <bdi dir="ltr">
                <span className="text-teal">{a.parsed.intent}</span>
                {a.parsed.vars.length > 0 && ` · ${a.parsed.vars.join(', ')}`}
                {a.parsed.filters.length > 0 &&
                  ` · ${a.parsed.filters.map((f) => `${f.col}=${f.value}`).join(', ')}`}
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
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {pick(s.label)}
                </div>
                <div className="mono num mt-0.5 text-[17px] font-semibold ltr">{s.value}</div>
              </div>
            ))}
          </div>
        )}
        {(a.chart || a.table) && (
          <div className={`mt-6 grid gap-6 ${a.chart && (a.table || a.r) ? 'xl:grid-cols-[1.3fr_1fr]' : ''}`}>
            {a.chart && <ChartView c={a.chart} title={pick(a.title)} />}
            <div className="min-w-0 space-y-4">
              {a.table && (
                <div className="max-h-[360px] overflow-auto rounded-xl border border-line">
                  <SimpleTable
                    head={a.table.head}
                    rows={a.table.rows}
                    numeric={a.table.head.map((_, i) => i).filter((i) => i > 0)}
                  />
                </div>
              )}
              {a.r && (
                <CodeTabs
                  tabs={[{ label: L('R code (same result)', 'كود R (نفس النتيجة)'), lang: 'r', code: a.r }]}
                />
              )}
            </div>
          </div>
        )}
        {!a.chart && !a.table && a.r && (
          <div className="mt-5">
            <CodeTabs
              tabs={[{ label: L('R code (same result)', 'كود R (نفس النتيجة)'), lang: 'r', code: a.r }]}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function RecentLog({ refresh }: { refresh: number }) {
  const { L } = useLang();
  const [rows, setRows] = useState<LoggedRequest[] | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      recentRequests(8)
        .then((r) => live && setRows(r))
        .catch(() => live && setRows([]));
    }, 600);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [refresh]);
  return (
    <div className="panel p-5">
      <p className="flex items-center gap-2 text-[13px] font-semibold">
        <Icon name="database" className="h-4 w-4 text-teal" />
        {L('Recent requests (Supabase)', 'آخر الطلبات (Supabase)')}
      </p>
      {rows === null ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-soft" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">{L('No requests yet.', 'ما في طلبات لسا.')}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li
              key={r.created_at + r.request}
              className="rounded-lg bg-soft px-3 py-2 text-[13px]"
              dir="auto"
            >
              {r.request}
              <span className="mono ms-2 text-[11px] text-teal ltr">{r.intent}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Ask() {
  const { L, lang } = useLang();
  const A = useAnalysis();
  const [q, setQ] = useState('');
  const [params] = useSearchParams();
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const run = useMemo(
    () =>
      (text: string): Turn => {
        const p = parseRequest(text);
        const a = answer(A.raw, p);
        void logRequest(text, p.intent);
        return { id: idRef.current++, q: text, a };
      },
    [A.raw],
  );
  // Open with one worked example so the page shows what it does.
  const [turns, setTurns] = useState<Turn[]>(() => {
    if (params.get('q')) return [];
    const text = lang === 'ar' ? 'هل الجنس بأثر على العلامة النهائية؟' : 'Does sex affect the final grade?';
    return [{ id: 0, q: text, a: answer(A.raw, parseRequest(text)) }];
  });
  // Requests typed in the top bar arrive as ?q=…&t=… and run here.
  const handled = useRef('');
  useEffect(() => {
    const text = params.get('q');
    const key = `${text}|${params.get('t')}`;
    if (text && handled.current !== key) {
      handled.current = key;
      setTurns((t) => [...t, run(text)]);
    }
  }, [params, run]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (turns.length > 1)
      endRef.current?.previousElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          'Type a request in English or Arabic: clean the data, describe a column, draw a chart, compare groups, test a relationship, fit a regression, or count with filters. Every answer is computed live on the 649 students and comes with its R code.',
          'اكتب طلبك بالعربي أو بالإنجليزي: نظّف البيانات، صف عمود، ارسم رسمة، قارن مجموعات، اختبر علاقة، اعمل انحدار، أو احسب عدد مع شروط. كل جواب بينحسب مباشرة على الـ 649 طالب ومعه كود R.',
        )}
      />

      <div className="grid gap-6 2xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="space-y-8">
            {turns.map((t) => (
              <AnswerCard key={t.id} t={t} />
            ))}
            <div ref={endRef} />
          </div>

          <div className="no-print sticky bottom-20 z-20 mt-10 lg:bottom-4">
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-line bg-surface p-3 shadow-[0_24px_60px_-24px_rgba(11,18,34,.45)]"
            >
              <label htmlFor="ask-input" className="sr-only">
                {L('Your request', 'طلبك')}
              </label>
              <div className="flex gap-2">
                <input
                  id="ask-input"
                  dir="auto"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={L(
                    'e.g. compare final grade by school',
                    'مثلًا: قارن العلامة النهائية حسب المدرسة',
                  )}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 text-[15px] text-ink outline-none focus:border-teal"
                  autoComplete="off"
                />
                <button type="submit" className="btn-primary h-12 px-5" disabled={!q.trim()}>
                  {L('Run', 'نفّذ')}
                </button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.en}
                    type="button"
                    className="chip shrink-0 whitespace-nowrap hover:border-teal hover:text-ink"
                    onClick={() => submit(lang === 'ar' ? ex.ar : ex.en)}
                  >
                    {lang === 'ar' ? ex.ar : ex.en}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>
        <aside className="no-print hidden space-y-4 2xl:block">
          <div className="panel sticky top-24 p-5">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <Icon name="spark" className="h-4 w-4 text-teal" />
              {L('What I can do', 'شو بقدر أعمل')}
            </p>
            <ul className="mt-3 space-y-2 text-[13px] text-muted">
              {[
                ['Clean, missing values, duplicates, outliers', 'تنظيف، قيم ناقصة، تكرار، قيم متطرفة'],
                ['Mean, median, mode, frequencies', 'متوسط، وسيط، منوال، تكرارات'],
                ['Histogram, box, bar, pie, scatter', 'هيستوغرام، بوكس، أعمدة، دائري، انتشار'],
                ['t-tests, chi-square, ANOVA + Tukey', 'اختبار t، كاي تربيع، ANOVA + توكي'],
                ['Correlation and regression', 'ارتباط وانحدار'],
                ['Counts with filters (girls, GP, failed…)', 'عدّ مع شروط (بنات، GP، راسبين…)'],
              ].map(([en, ar]) => (
                <li key={en} className="flex gap-2">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  {L(en, ar)}
                </li>
              ))}
            </ul>
            {supabaseConfigured && (
              <div className="mt-4">
                <RecentLog refresh={turns.length} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
