import { Link, useNavigate } from 'react-router-dom';
import { ChartFrame, LegendItem } from '../components/charts/ChartFrame';
import { HBarSvg, HistogramSvg, PieSvg, VBarSvg } from '../components/charts/Charts';
import { HeroDots } from '../components/HeroDots';
import { Icon, type IconName } from '../components/Icon';
import { STAGES } from '../content/stages';
import { dataset } from '../data/backend';
import { useLang } from '../i18n/lang';
import { fmt, fmtP, pct } from '../lib/format';
import { useAnalysis } from '../state/analysis';

function KpiCard({
  icon,
  tone,
  label,
  value,
  foot,
  delay = 0,
}: {
  icon: IconName;
  tone: 'teal' | 'coral' | 'violet' | 'sky' | 'amber';
  label: string;
  value: string;
  foot: string;
  delay?: number;
}) {
  const bg = `color-mix(in srgb, var(--${tone}) 14%, var(--surface))`;
  return (
    <div className="panel count-in p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className="kpi-icon" style={{ background: bg, color: `var(--${tone}-text, var(--${tone}))` }}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-1 font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] num ltr sm:text-[38px]">
        {value}
      </p>
      <p className="mt-3 text-[12.5px] text-muted">{foot}</p>
    </div>
  );
}

function Panel({
  title,
  sub,
  to,
  children,
  className = '',
}: {
  title: string;
  sub?: string;
  to?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { L } = useLang();
  return (
    <section className={`panel flex flex-col ${className}`}>
      <div className="panel-head">
        <div className="min-w-0">
          <h2 className="panel-title">{title}</h2>
          {sub && <p className="panel-sub">{sub}</p>}
        </div>
        {to && (
          <Link
            to={to}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-teal hover:bg-tint"
          >
            {L('Details', 'التفاصيل')}
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="panel-body flex-1">{children}</div>
    </section>
  );
}

export default function Home() {
  const A = useAnalysis();
  const { L } = useLang();
  const navigate = useNavigate();
  const ds = dataset();
  const meanG3 = A.desc.find((d) => d.variable === 'G3')!;
  const strongest = [...A.cor_G3].sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  const topCor = strongest
    .filter((c) => !['G1', 'G2'].includes(c.variable))
    .slice(0, 7)
    .reverse();
  const conf = A.logit_confusion;

  const findings = [
    {
      to: '/test',
      tag: L('ANOVA', 'تحليل التباين'),
      title: L('Past failures cut the grade most', 'الرسوب السابق أكثر شي بنزّل العلامة'),
      value: `η² = ${fmt(A.anova_fail.eta2, 3)}`,
      body: L(
        `Students with no past failures average ${fmt(A.by_fail[0].mean_G3, 1)}; with 2 or more, ${fmt(A.by_fail[A.by_fail.length - 1].mean_G3, 1)}. F = ${fmt(A.anova_fail.F, 2)}, p = ${fmtP(A.anova_fail.p)}.`,
        `الطلاب اللي ما رسبوا قبل معدلهم ${fmt(A.by_fail[0].mean_G3, 1)}، واللي رسبوا مرتين أو أكثر ${fmt(A.by_fail[A.by_fail.length - 1].mean_G3, 1)}. F = ${fmt(A.anova_fail.F, 2)}، p = ${fmtP(A.anova_fail.p)}.`,
      ),
      sig: true,
    },
    {
      to: '/test',
      tag: L('Welch t-test', 'اختبار ويلش t'),
      title: L('Wanting university matters', 'الرغبة بالجامعة بتفرق'),
      value: `t = ${fmt(A.t_higher.statistic, 2)}`,
      body: L(
        `Students who plan higher education score clearly higher; the chi-square test agrees for passing (χ² = ${fmt(A.chi_higher.statistic, 2)}).`,
        `الطلاب اللي ناويين يكملوا جامعة علاماتهم أعلى بوضوح، واختبار كاي تربيع بأكد نفس الشي للنجاح (χ² = ${fmt(A.chi_higher.statistic, 2)}).`,
      ),
      sig: true,
    },
    {
      to: '/model',
      tag: L('Regression', 'الانحدار'),
      title: L('G2 predicts G3 almost exactly', 'G2 بتنبأ بـ G3 تقريبًا بالضبط'),
      value: `R² = ${fmt(A.lm_simple.r2, 3)}`,
      body: L(
        `G3 ≈ ${fmt(A.lm_simple.coef[0].estimate, 3)} + ${fmt(A.lm_simple.coef[1].estimate, 4)} × G2. Without earlier grades, background explains only R² = ${fmt(A.lm_multi.r2, 3)}.`,
        `G3 ≈ ${fmt(A.lm_simple.coef[0].estimate, 3)} + ${fmt(A.lm_simple.coef[1].estimate, 4)} × G2. وبدون العلامات السابقة، الخلفية بتفسّر بس R² = ${fmt(A.lm_multi.r2, 3)}.`,
      ),
      sig: true,
    },
    {
      to: '/model',
      tag: L('Logistic model', 'النموذج اللوجستي'),
      title: L('Only slightly better than guessing', 'أحسن بشوي بس من التخمين'),
      value: pct(conf.accuracy),
      body: L(
        `Accuracy ${pct(conf.accuracy)} vs ${pct(conf.baseline)} for always saying "Pass"; it catches ${conf.matrix[0][0]} of ${A.pass_counts.Fail} real fails.`,
        `الدقة ${pct(conf.accuracy)} مقابل ${pct(conf.baseline)} لو قلنا دايمًا "ناجح"؛ وبمسك ${conf.matrix[0][0]} من أصل ${A.pass_counts.Fail} راسب حقيقي.`,
      ),
      sig: false,
    },
  ];

  const asks = [
    ['Compare final grade by school', 'قارن العلامة النهائية حسب المدرسة'],
    ['How many girls failed?', 'كم بنت رسبت؟'],
    ['Box plot of G3 by study time', 'بوكس بلوت للعلامة حسب ساعات الدراسة'],
    ['Correlation between absences and G3', 'الارتباط بين الغياب والعلامة'],
  ] as const;

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <section className="hero-banner">
        <div className="relative z-10 grid items-center gap-8 px-6 py-8 sm:px-10 sm:py-10 xl:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[12px] font-semibold text-[#bfe9e1]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2ec4ae]" />
                {ds.source === 'supabase'
                  ? L('Live from Supabase', 'مباشر من Supabase')
                  : L('Live analysis in your browser', 'تحليل مباشر في متصفحك')}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[12px] text-[#98a3ba]">
                {L('Data Science Programming · R', 'برمجة علم البيانات · R')}
              </span>
            </div>
            <h1 className="mt-5 text-[38px] font-extrabold leading-[1.02] tracking-[-0.035em] text-white sm:text-[56px]">
              {L('What decides a', 'شو اللي بحدد')}{' '}
              <span className="bg-gradient-to-r from-[#2EC4AE] via-[#7DE8D6] to-[#9487f7] bg-clip-text text-transparent">
                {L('final grade?', 'العلامة النهائية؟')}
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-[#aeb8cc] sm:text-[17px]">
              {L(
                `${A.n_rows} Portuguese students, ${A.n_cols} attributes, a full R analysis: cleaning, statistics, hypothesis tests, models and charts. Every number below is computed live from the raw data.`,
                `${A.n_rows} طالب، ${A.n_cols} عمود، وتحليل R كامل: تنظيف وإحصاء واختبارات فرضيات ونماذج ورسومات. كل رقم تحت محسوب مباشرة من البيانات الخام.`,
              )}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/data"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#2EC4AE] px-6 text-[15px] font-bold text-[#05201b] shadow-[0_12px_30px_-10px_rgba(46,196,174,.8)] transition hover:brightness-110"
              >
                {L('Start the analysis', 'ابدأ التحليل')}
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link
                to="/ask"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-6 text-[15px] font-semibold text-white transition hover:bg-white/[0.12]"
              >
                <Icon name="spark" className="h-4 w-4 text-[#2ec4ae]" />
                {L('Ask PULSE', 'اسأل PULSE')}
              </Link>
            </div>
          </div>
          <div dir="ltr" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <HeroDots grades={A.raw.map((r) => r.G3)} />
            <p className="mt-1 flex flex-wrap gap-4 text-[12px] text-[#98a3ba]">
              <span>
                <i aria-hidden className="me-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#2EC4AE]" />
                {L(`Pass (G3 ≥ 10): ${A.pass_counts.Pass}`, `ناجح: ${A.pass_counts.Pass}`)}
              </span>
              <span>
                <i aria-hidden className="me-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#FF6B55]" />
                {L(`Fail: ${A.pass_counts.Fail}`, `راسب: ${A.pass_counts.Fail}`)}
              </span>
              <span className="ms-auto">{L('every dot is one student', 'كل نقطة طالب')}</span>
            </p>
          </div>
        </div>
      </section>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          icon="users"
          tone="sky"
          label={L('Students analysed', 'عدد الطلاب')}
          value={String(A.n_rows)}
          foot={L(
            `${A.n_cols} columns · ${A.total_na} missing · ${A.duplicates} duplicates`,
            `${A.n_cols} عمود · ${A.total_na} مفقود · ${A.duplicates} مكرر`,
          )}
        />
        <KpiCard
          icon="check"
          tone="teal"
          label={L('Pass rate', 'نسبة النجاح')}
          value={pct(A.pass_rate)}
          foot={L(
            `${A.pass_counts.Pass} passed · ${A.pass_counts.Fail} failed (G3 < 10)`,
            `${A.pass_counts.Pass} نجحوا · ${A.pass_counts.Fail} رسبوا (G3 < 10)`,
          )}
          delay={60}
        />
        <KpiCard
          icon="sigma"
          tone="violet"
          label={L('Mean final grade', 'متوسط العلامة النهائية')}
          value={fmt(meanG3.mean, 2)}
          foot={L(
            `median ${meanG3.median} · mode ${meanG3.mode} · sd ${fmt(meanG3.sd, 2)}`,
            `الوسيط ${meanG3.median} · المنوال ${meanG3.mode} · الانحراف ${fmt(meanG3.sd, 2)}`,
          )}
          delay={120}
        />
        <KpiCard
          icon="trend"
          tone="amber"
          label={L('Strongest link with G3', 'أقوى علاقة مع G3')}
          value={`r ${fmt(A.r_G2G3, 3)}`}
          foot={L('second-period grade G2 (Pearson)', 'علامة الفترة الثانية G2 (بيرسون)')}
          delay={180}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title={L('How final grades are distributed', 'كيف تتوزع العلامات النهائية')}
          sub={L(
            'Histogram of G3, coral bars are below the pass mark',
            'مدرج تكراري لـ G3، الأعمدة المرجانية تحت علامة النجاح',
          )}
          to="/describe"
        >
          <ChartFrame
            title={L('Final grade G3', 'العلامة النهائية G3')}
            desc={L('Histogram of the final grade', 'مدرج تكراري للعلامة النهائية')}
            width={640}
            height={280}
          >
            <HistogramSvg
              values={A.raw.map((r) => r.G3)}
              xLabel={L('Final grade (0–20)', 'العلامة النهائية (0–20)')}
              yLabel={L('Students', 'الطلاب')}
              height={280}
              domain={[0, 19]}
              colorFn={(b) => (b >= 10 ? 'var(--teal)' : 'var(--coral)')}
              markers={[
                {
                  x: meanG3.mean,
                  label: L(`mean ${fmt(meanG3.mean, 2)}`, `المتوسط ${fmt(meanG3.mean, 2)}`),
                  color: 'var(--ink)',
                  dashed: true,
                },
              ]}
            />
          </ChartFrame>
        </Panel>
        <Panel
          title={L('Pass or fail', 'نجاح أو رسوب')}
          sub={L('Students by outcome', 'الطلاب حسب النتيجة')}
          to="/visualize"
        >
          <ChartFrame
            title={L(`${pct(A.pass_rate)} pass`, `${pct(A.pass_rate)} نجحوا`)}
            desc={L('Donut chart of pass and fail', 'مخطط دائري للنجاح والرسوب')}
            width={640}
            height={300}
            legend={
              <>
                <LegendItem
                  color="var(--teal)"
                  label={L(`Pass ${A.pass_counts.Pass}`, `ناجح ${A.pass_counts.Pass}`)}
                />
                <LegendItem
                  color="var(--coral)"
                  label={L(`Fail ${A.pass_counts.Fail}`, `راسب ${A.pass_counts.Fail}`)}
                />
              </>
            }
          >
            <PieSvg
              slices={[
                { label: 'Pass', value: A.pass_counts.Pass, color: 'var(--teal)' },
                { label: 'Fail', value: A.pass_counts.Fail, color: 'var(--coral)' },
              ]}
              size={300}
            />
          </ChartFrame>
        </Panel>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel
          title={L('Past failures', 'الرسوب السابق')}
          sub={L('Mean G3 by number of past failures', 'متوسط G3 حسب عدد مرات الرسوب')}
          to="/test"
        >
          <ChartFrame
            title={L(
              `F = ${fmt(A.anova_fail.F, 2)}, p = ${fmtP(A.anova_fail.p)}`,
              `F = ${fmt(A.anova_fail.F, 2)}، p = ${fmtP(A.anova_fail.p)}`,
            )}
            desc={L(
              'Bar chart of mean final grade by past failures',
              'أعمدة متوسط العلامة حسب الرسوب السابق',
            )}
            width={640}
            height={300}
          >
            <VBarSvg
              categories={A.by_fail.map((g) => g.level)}
              series={[
                {
                  name: 'G3',
                  color: 'var(--violet)',
                  values: A.by_fail.map((g) => Math.round(g.mean_G3 * 100) / 100),
                },
              ]}
              yLabel={L('Mean G3', 'متوسط G3')}
              xLabel={L('Past failures', 'مرات الرسوب')}
              height={300}
              yDomain={[0, 14]}
              valueFormat={(v) => fmt(v, 2)}
            />
          </ChartFrame>
        </Panel>
        <Panel
          title={L('Study time', 'وقت الدراسة')}
          sub={L('Pass rate by weekly study time', 'نسبة النجاح حسب ساعات الدراسة أسبوعيًا')}
          to="/test"
        >
          <ChartFrame
            title={L(`ANOVA F = ${fmt(A.anova_study.F, 2)}`, `ANOVA F = ${fmt(A.anova_study.F, 2)}`)}
            desc={L('Pass rate by study time', 'نسبة النجاح حسب وقت الدراسة')}
            width={640}
            height={300}
          >
            <VBarSvg
              categories={A.by_study.map((g) => g.level)}
              series={[
                {
                  name: '%',
                  color: 'var(--teal)',
                  values: A.by_study.map((g) => Math.round(g.pass_rate * 10) / 10),
                },
              ]}
              yLabel={L('Pass rate (%)', 'نسبة النجاح (%)')}
              height={300}
              yDomain={[0, 100]}
              valueFormat={(v) => `${fmt(v, 1)}%`}
            />
          </ChartFrame>
        </Panel>
        <Panel
          title={L('What moves with G3', 'شو بتحرك مع G3')}
          sub={L(
            'Pearson r with the final grade (G1, G2 left out)',
            'معامل بيرسون مع العلامة النهائية (بدون G1 وG2)',
          )}
          to="/describe"
          className="lg:col-span-2 xl:col-span-1"
        >
          <ChartFrame
            title={L(
              `Strongest: ${topCor[topCor.length - 1].variable}`,
              `الأقوى: ${topCor[topCor.length - 1].variable}`,
            )}
            desc={L('Horizontal bars of correlation with G3', 'أعمدة أفقية للارتباط مع G3')}
            width={640}
            height={300}
          >
            <HBarSvg
              bars={topCor.map((c) => ({
                label: c.variable,
                value: c.r,
                color: c.r < 0 ? 'var(--coral)' : 'var(--teal)',
              }))}
              valueFormat={(v) => fmt(v, 3)}
              height={300}
              labelWidth={110}
            />
          </ChartFrame>
        </Panel>
      </div>

      {/* Findings */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{L('Key findings', 'أهم النتائج')}</p>
            <h2 className="mt-1 text-[24px] font-extrabold sm:text-[28px]">
              {L('What the analysis shows', 'شو طلع معنا من التحليل')}
            </h2>
          </div>
          <Link to="/report" className="btn-ghost hidden sm:inline-flex">
            {L('Full report', 'التقرير الكامل')}
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {findings.map((f) => (
            <Link key={f.title} to={f.to} className="finding">
              <div className="flex items-center justify-between gap-2">
                <span className="badge badge-muted">{f.tag}</span>
                <span className={`badge ${f.sig ? 'badge-teal' : 'badge-amber'}`}>
                  <Icon name={f.sig ? 'check' : 'alert'} className="h-3.5 w-3.5" />
                  {f.sig ? L('significant', 'دال إحصائيًا') : L('weak', 'ضعيف')}
                </span>
              </div>
              <p className="mono mt-4 text-[22px] font-semibold text-ink ltr">{f.value}</p>
              <h3 className="mt-1 text-[17px] font-bold leading-snug">{f.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{f.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Ask + pipeline */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="panel overflow-hidden">
          <div className="hero-banner rounded-none p-6 sm:p-7">
            <div className="relative z-10">
              <span className="badge bg-[#2ec4ae] text-[#05201b]">
                <Icon name="spark" className="h-3.5 w-3.5" />
                Ask PULSE
              </span>
              <h2 className="mt-3 text-[24px] font-extrabold leading-tight text-white sm:text-[28px]">
                {L('Ask like you would ask an analyst.', 'اطلب زي ما بتطلب من محلل بيانات.')}
              </h2>
              <p className="mt-2 max-w-lg text-[14.5px] text-[#aeb8cc]">
                {L(
                  'English or Arabic. You get the test, the chart, the explanation and the R code.',
                  'بالعربي أو بالإنجليزي. بيطلعلك الاختبار والرسمة والتفسير وكود R.',
                )}
              </p>
            </div>
          </div>
          <div className="grid gap-2 p-5 sm:grid-cols-2 sm:p-6">
            {asks.map(([en, ar]) => (
              <button
                key={en}
                type="button"
                onClick={() => navigate(`/ask?q=${encodeURIComponent(L(en, ar))}&t=${Date.now()}`)}
                className="flex items-center gap-3 rounded-xl border border-line bg-soft px-4 py-3 text-start text-[14px] font-medium transition hover:border-teal hover:bg-tint"
              >
                <Icon name="send" className="h-4 w-4 shrink-0 text-teal" />
                {L(en, ar)}
              </button>
            ))}
          </div>
        </section>
        <Panel
          title={L('The analysis pipeline', 'مسار التحليل')}
          sub={L(
            'Eight stages, the same order as pulse_analysis.R',
            'ثماني مراحل، بنفس ترتيب pulse_analysis.R',
          )}
        >
          <ol className="grid gap-2 sm:grid-cols-2">
            {STAGES.map((s) => (
              <li key={s.path}>
                <Link
                  to={s.path}
                  className="group flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 transition hover:border-teal hover:bg-tint"
                >
                  <span className="mono grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--navy)] text-[12px] font-bold text-[#2ec4ae]">
                    {String(s.step).padStart(2, '0')}
                  </span>
                  <span className="font-semibold">{L(s.en, s.ar)}</span>
                  <Icon
                    name="arrow"
                    className="ms-auto h-4 w-4 text-muted transition group-hover:text-teal"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
