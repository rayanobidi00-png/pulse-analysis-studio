import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ChartFrame, LegendItem, PALETTE } from '../components/charts/ChartFrame';
import { BoxPlotSvg, HistogramSvg, PieSvg, ScatterSvg, VBarSvg } from '../components/charts/Charts';
import { CodeTabs, PageHeader, SimpleTable } from '../components/ui';
import { answer, EXAMPLES, parseRequest, type Answer, type ChartSpec } from '../assistant/engine';
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

const INTENT_NAME: Record<string, [string, string]> = {
  help: ['Help', 'مساعدة'],
  clean: ['Cleaning report', 'تقرير التنظيف'],
  missing: ['Missing values', 'القيم المفقودة'],
  duplicates: ['Duplicates', 'التكرار'],
  outliers: ['Outliers (IQR rule)', 'القيم المتطرفة (قاعدة IQR)'],
  describe: ['Descriptive statistics', 'إحصاء وصفي'],
  histogram: ['Histogram', 'مدرج تكراري'],
  boxplot: ['Box plot', 'مخطط صندوقي'],
  bar: ['Bar chart', 'مخطط أعمدة'],
  pie: ['Pie chart', 'مخطط دائري'],
  scatter: ['Scatter plot', 'مخطط انتشار'],
  correlation: ['Correlation test', 'اختبار الارتباط'],
  compare: ['Group comparison', 'مقارنة مجموعات'],
  onesample: ['One-sample t-test', 'اختبار t لعينة واحدة'],
  paired: ['Paired t-test', 'اختبار t للأزواج'],
  regression: ['Linear regression', 'انحدار خطي'],
  passrate: ['Pass rate', 'نسبة النجاح'],
  count: ['Count', 'عدّ'],
  mean: ['Mean', 'متوسط'],
  top: ['Ranking', 'ترتيب'],
};

function ResultBlock({ t, latest }: { t: Turn; latest: boolean }) {
  const { L, lang } = useLang();
  const a = t.a;
  const pick = (b: { en: string; ar: string }) => (lang === 'ar' ? b.ar : b.en);
  const method = INTENT_NAME[a.parsed.intent] ?? [a.parsed.intent, a.parsed.intent];
  const rTab = a.r
    ? [{ label: L('R code (same result)', 'كود R (نفس النتيجة)'), lang: 'r' as const, code: a.r }]
    : null;
  return (
    <article className={`fade-up border-t border-line py-8 ${latest ? '' : 'opacity-95'}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-[13.5px] text-muted">
        <p>
          {L('Request', 'الطلب')}:{' '}
          <q className="font-medium text-ink" dir="auto">
            {t.q}
          </q>
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <span className={`badge ${a.ok ? 'badge-teal' : 'badge-amber'}`}>{L(method[0], method[1])}</span>
          {a.parsed.vars.length > 0 && <span className="mono ltr">{a.parsed.vars.join(', ')}</span>}
          {a.parsed.filters.length > 0 && (
            <span className="mono ltr">
              [{a.parsed.filters.map((f) => `${f.col}=${f.value}`).join(', ')}]
            </span>
          )}
        </p>
      </div>
      <h2 className="mt-3 text-[26px] leading-snug">{pick(a.title)}</h2>
      <p className="mt-2 max-w-4xl text-[16px] leading-relaxed">{pick(a.summary)}</p>
      {a.stats && (
        <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-card border-s border-t border-line sm:grid-cols-4">
          {a.stats.map((s) => (
            <div key={s.label.en} className="border-b border-e border-line px-4 py-3">
              <dt className="text-[12.5px] text-muted">{pick(s.label)}</dt>
              <dd className="mono num mt-0.5 text-[17px] font-semibold ltr">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {(a.chart || a.table) && (
        <div className={`mt-6 grid gap-6 ${a.chart && (a.table || a.r) ? 'xl:grid-cols-[1.3fr_1fr]' : ''}`}>
          {a.chart && (
            <div className="rounded-card border border-line p-5">
              <ChartView c={a.chart} title={pick(a.title)} />
            </div>
          )}
          <div className="min-w-0 space-y-4">
            {a.table && (
              <div className="max-h-[360px] overflow-auto rounded-card border border-line">
                <SimpleTable
                  head={a.table.head}
                  rows={a.table.rows}
                  numeric={a.table.head.map((_, i) => i).filter((i) => i > 0)}
                />
              </div>
            )}
            {rTab && <CodeTabs tabs={rTab} />}
          </div>
        </div>
      )}
      {!a.chart && !a.table && rTab && (
        <div className="mt-5">
          <CodeTabs tabs={rTab} />
        </div>
      )}
    </article>
  );
}

export default function Ask() {
  const { L, lang } = useLang();
  const A = useAnalysis();
  const [q, setQ] = useState('');
  const [params] = useSearchParams();
  const idRef = useRef(1);
  const topRef = useRef<HTMLDivElement>(null);
  const run = useMemo(
    () =>
      (text: string): Turn => ({ id: idRef.current++, q: text, a: answer(A.raw, parseRequest(text)) }),
    [A.raw],
  );
  // Newest result first, like a search tool. Opens with one worked example.
  const [turns, setTurns] = useState<Turn[]>(() => {
    if (params.get('q')) return [];
    const text = lang === 'ar' ? 'هل يؤثر الجنس على العلامة النهائية؟' : 'Does sex affect the final grade?';
    return [{ id: 0, q: text, a: answer(A.raw, parseRequest(text)) }];
  });
  // Requests from the home page arrive as ?q=…&t=… and run here.
  const handled = useRef('');
  useEffect(() => {
    const text = params.get('q');
    const key = `${text}|${params.get('t')}`;
    if (text && handled.current !== key) {
      handled.current = key;
      setTurns((t) => [run(text), ...t]);
    }
  }, [params, run]);

  const submit = (text: string) => {
    const s = text.trim();
    if (!s) return;
    setTurns((t) => [run(s), ...t]);
    setQ('');
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(q);
  };

  const abilities = [
    ['Cleaning: missing values, duplicates, outliers', 'التنظيف: القيم المفقودة، التكرار، القيم المتطرفة'],
    ['Describe a column: mean, median, mode, frequencies', 'وصف عمود: المتوسط، الوسيط، المنوال، التكرارات'],
    ['Charts: histogram, box plot, bar, pie, scatter', 'رسوم: مدرج تكراري، صندوقي، أعمدة، دائري، انتشار'],
    ['Tests: t-tests, chi-square, ANOVA with Tukey', 'اختبارات: t، مربع كاي، ANOVA مع توكي'],
    ['Correlation and linear regression', 'الارتباط والانحدار الخطي'],
    ['Counts and means with filters (girls, GP, failed…)', 'عدّ ومتوسطات مع شروط (بنات، GP، راسبين…)'],
  ];

  return (
    <div>
      <PageHeader
        eyebrow={L('Ask the data', 'اسأل البيانات')}
        title={L('Ask the data a question', 'اسأل البيانات سؤالًا')}
        lead={L(
          'Write what you want to know in English or Arabic. The site chooses the method, runs it on all 649 students and gives the result, a chart where it helps, a short explanation and the R code that produces the same numbers.',
          'اكتب ما تريد معرفته بالعربي أو بالإنجليزي. يختار الموقع الطريقة، ويشغّلها على الـ 649 طالبًا، ويعطي النتيجة ورسمًا عند الحاجة وشرحًا قصيرًا وكود R الذي يعطي الأرقام نفسها.',
        )}
      />

      <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <form
            onSubmit={onSubmit}
            role="search"
            className="flex overflow-hidden rounded-md border border-line bg-surface focus-within:border-ink"
          >
            <label htmlFor="ask-input" className="sr-only">
              {L('Your request', 'طلبك')}
            </label>
            <input
              id="ask-input"
              dir="auto"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={L(
                'e.g. compare the final grade by school',
                'مثلًا: قارن العلامة النهائية حسب المدرسة',
              )}
              className="h-14 min-w-0 flex-1 bg-transparent px-4 text-[16px] outline-none"
              autoComplete="off"
            />
            <button type="submit" className="btn-primary h-14 rounded-none px-6" disabled={!q.trim()}>
              {L('Run', 'نفّذ')}
            </button>
          </form>
          <div ref={topRef} className="mt-8 scroll-mt-32">
            {turns.map((t, i) => (
              <ResultBlock key={t.id} t={t} latest={i === 0} />
            ))}
          </div>
        </div>
        <aside className="no-print space-y-8 lg:sticky lg:top-24 lg:self-start">
          <div>
            <h2 className="text-[18px]">{L('What you can ask', 'ماذا يمكنك أن تسأل')}</h2>
            <ul className="mt-3 space-y-2.5 text-[14px] text-muted">
              {abilities.map(([en, ar]) => (
                <li key={en} className="flex gap-2">
                  <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-teal" />
                  {L(en, ar)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-[18px]">{L('Examples', 'أمثلة')}</h2>
            <ul className="mt-3 space-y-2 text-[14px]">
              {EXAMPLES.map((ex) => (
                <li key={ex.en}>
                  <button
                    type="button"
                    className="prose-link text-start"
                    onClick={() => submit(lang === 'ar' ? ex.ar : ex.en)}
                  >
                    {lang === 'ar' ? ex.ar : ex.en}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
