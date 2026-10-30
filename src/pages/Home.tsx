import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChartFrame } from '../components/charts/ChartFrame';
import { HBarSvg, HistogramSvg, VBarSvg } from '../components/charts/Charts';
import { HeroDots } from '../components/HeroDots';
import { Icon } from '../components/Icon';
import { STAGES } from '../content/stages';
import { TEAM } from '../content/team';
import { useLang } from '../i18n/lang';
import { fmt, fmtP, pct } from '../lib/format';
import { useAnalysis } from '../state/analysis';

const SOURCE_EN =
  'Source: UCI Student Performance (Cortez & Silva, 2008), student-por.csv. Computed in this page from the raw file.';
const SOURCE_AR =
  'المصدر: بيانات أداء الطلاب من UCI (Cortez و Silva، 2008)، الملف student-por.csv. محسوبة في هذه الصفحة من الملف الخام.';

function AskBox() {
  const { L } = useLang();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const go = (text: string) => navigate(`/ask?q=${encodeURIComponent(text)}&t=${Date.now()}`);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) go(q.trim());
  };
  const examples = [
    ['Compare the final grade by school', 'قارن العلامة النهائية حسب المدرسة'],
    ['How many girls failed?', 'كم بنت رسبت؟'],
    ['Box plot of G3 by study time', 'مخطط صندوقي للعلامة حسب وقت الدراسة'],
    ['Correlation between absences and G3', 'الارتباط بين الغياب والعلامة'],
  ] as const;
  return (
    <div>
      <form
        onSubmit={submit}
        role="search"
        className="flex overflow-hidden rounded-md border border-line bg-surface focus-within:border-ink"
      >
        <label htmlFor="home-ask" className="sr-only">
          {L('Type a request', 'اكتب طلبك')}
        </label>
        <input
          id="home-ask"
          dir="auto"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={L(
            'Type a request, for example: is study time related to passing?',
            'اكتب طلبك، مثلًا: هل وقت الدراسة مرتبط بالنجاح؟',
          )}
          className="h-14 min-w-0 flex-1 bg-transparent px-4 text-[16px] outline-none"
          autoComplete="off"
        />
        <button type="submit" className="btn-primary h-14 rounded-none px-6">
          {L('Run', 'نفّذ')}
        </button>
      </form>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-muted">
        <span>{L('Try:', 'جرّب:')}</span>
        {examples.map(([en, ar]) => (
          <button key={en} type="button" className="prose-link" onClick={() => go(L(en, ar))}>
            {L(en, ar)}
          </button>
        ))}
      </p>
    </div>
  );
}

export default function Home() {
  const A = useAnalysis();
  const { L } = useLang();
  const g3 = A.desc.find((d) => d.variable === 'G3')!;
  const conf = A.logit_confusion;
  const topCor = [...A.cor_G3]
    .filter((c) => !['G1', 'G2'].includes(c.variable))
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, 7)
    .reverse();

  const numbers = [
    { v: String(A.n_rows), l: L('students in the study', 'طالبًا في الدراسة') },
    { v: pct(A.pass_rate), l: L('passed Portuguese (G3 ≥ 10)', 'نجحوا في المادة (G3 ≥ 10)') },
    { v: fmt(g3.mean, 2), l: L('mean final grade out of 20', 'متوسط العلامة النهائية من 20') },
    { v: fmt(A.r_G2G3, 3), l: L('correlation of G2 with G3', 'ارتباط G2 مع G3') },
  ];

  const findings = [
    {
      to: '/test',
      title: L('Past failures are the strongest warning sign', 'الرسوب السابق أقوى علامة إنذار'),
      body: L(
        `Students with no earlier failures average ${fmt(A.by_fail[0].mean_G3, 1)} out of 20; students who failed twice or more average ${fmt(A.by_fail[A.by_fail.length - 1].mean_G3, 1)}. One-way ANOVA: F = ${fmt(A.anova_fail.F, 2)}, p = ${fmtP(A.anova_fail.p)}, η² = ${fmt(A.anova_fail.eta2, 3)}.`,
        `الطلاب الذين لم يرسبوا سابقًا متوسطهم ${fmt(A.by_fail[0].mean_G3, 1)} من 20، ومن رسبوا مرتين أو أكثر متوسطهم ${fmt(A.by_fail[A.by_fail.length - 1].mean_G3, 1)}. تحليل التباين الأحادي: F = ${fmt(A.anova_fail.F, 2)}، p = ${fmtP(A.anova_fail.p)}، η² = ${fmt(A.anova_fail.eta2, 3)}.`,
      ),
    },
    {
      to: '/test',
      title: L(
        'Planning to go to university goes with higher grades',
        'نيّة الالتحاق بالجامعة ترتبط بعلامات أعلى',
      ),
      body: L(
        `The Welch t-test between students who do and do not want higher education gives t = ${fmt(A.t_higher.statistic, 2)}, p = ${fmtP(A.t_higher.p)}; passing is linked too (χ² = ${fmt(A.chi_higher.statistic, 2)}).`,
        `اختبار ويلش بين من يريد التعليم العالي ومن لا يريده يعطي t = ${fmt(A.t_higher.statistic, 2)}، p = ${fmtP(A.t_higher.p)}؛ والنجاح مرتبط أيضًا (χ² = ${fmt(A.chi_higher.statistic, 2)}).`,
      ),
    },
    {
      to: '/model',
      title: L(
        'The second-period grade almost decides the final one',
        'علامة الفترة الثانية تكاد تحدد النهائية',
      ),
      body: L(
        `A simple regression of G3 on G2 explains R² = ${fmt(A.lm_simple.r2, 3)} of the variation. Without earlier grades, ten background variables together reach only R² = ${fmt(A.lm_multi.r2, 3)}.`,
        `الانحدار البسيط لـ G3 على G2 يفسر R² = ${fmt(A.lm_simple.r2, 3)} من التباين. وبدون العلامات السابقة، عشرة متغيرات خلفية مجتمعة تصل فقط إلى R² = ${fmt(A.lm_multi.r2, 3)}.`,
      ),
    },
    {
      to: '/model',
      title: L('Predicting who fails is hard', 'التنبؤ بالراسبين صعب'),
      body: L(
        `The logistic model is right ${pct(conf.accuracy)} of the time, against ${pct(conf.baseline)} for simply predicting that everyone passes. It finds ${conf.matrix[0][0]} of the ${A.pass_counts.Fail} students who actually failed.`,
        `النموذج اللوجستي يصيب في ${pct(conf.accuracy)} من الحالات، مقابل ${pct(conf.baseline)} لو توقعنا نجاح الجميع. ويكتشف ${conf.matrix[0][0]} من أصل ${A.pass_counts.Fail} طالبًا رسبوا فعلًا.`,
      ),
    },
  ];

  return (
    <div>
      {/* Lead story */}
      <section className="border-b border-line">
        <div className="wrap grid gap-12 py-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-20">
          <div>
            <p className="eyebrow">
              {L(`${TEAM.course.en} · Data analysis project`, `${TEAM.course.ar} · مشروع تحليل بيانات`)}
            </p>
            <h1 className="mt-4 text-[40px] leading-[1.06] sm:text-[58px]">
              {L('What decides whether a student passes?', 'ما الذي يحدد نجاح الطالب؟')}
            </h1>
            <p className="lede mt-6 max-w-xl">
              {L(
                `We followed ${A.n_rows} Portuguese secondary-school students through a full year and asked which parts of their background, habits and earlier results explain the final grade. This site is the complete analysis: the data, the cleaning, the statistics, the models and the report.`,
                `تتبعنا ${A.n_rows} طالبًا في مدارس ثانوية برتغالية خلال سنة كاملة، وسألنا: أي جوانب الخلفية والعادات والنتائج السابقة تفسر العلامة النهائية؟ هذا الموقع هو التحليل كاملًا: البيانات والتنظيف والإحصاء والنماذج والتقرير.`,
              )}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/data" className="btn-primary h-12 px-6 text-[15px]">
                {L('Read the analysis', 'اقرأ التحليل')}
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link to="/report" className="btn-ghost h-12 px-6 text-[15px]">
                {L('Open the report', 'افتح التقرير')}
              </Link>
            </div>
          </div>
          <figure>
            <div dir="ltr" className="rounded-card border border-line bg-band p-5 sm:p-6">
              <HeroDots grades={A.raw.map((r) => r.G3)} />
            </div>
            <figcaption className="mt-3 text-[14px] leading-relaxed">
              <b>{L('Figure 1.', 'الشكل 1.')}</b>{' '}
              {L(
                `Every dot is one student, placed at their final grade. ${A.pass_counts.Fail} students (coral) finished below the pass mark of 10.`,
                `كل نقطة طالب واحد عند علامته النهائية. ${A.pass_counts.Fail} طالبًا (باللون المرجاني) أنهوا تحت علامة النجاح 10.`,
              )}
              <span className="figure-note block">{L(SOURCE_EN, SOURCE_AR)}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Numbers */}
      <section className="border-b border-line bg-band">
        <dl className="wrap grid grid-cols-2 lg:grid-cols-4">
          {numbers.map((n, i) => (
            <div
              key={n.l}
              className={`py-9 ${i % 2 === 1 ? 'border-s border-line ps-6' : ''} ${i === 2 ? 'border-t border-line lg:border-s lg:border-t-0 lg:ps-8' : ''} ${i === 3 ? 'border-t lg:border-t-0 lg:ps-8' : ''} ${i === 1 ? 'lg:ps-8' : ''}`}
            >
              <dd className="stat-big text-[40px] sm:text-[48px]">
                <bdi dir="ltr">{n.v}</bdi>
              </dd>
              <dt className="mt-2 text-[14px] text-muted">{n.l}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Findings */}
      <section className="wrap py-16 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{L('Main findings', 'أهم النتائج')}</p>
            <h2 className="mt-2 text-[32px] leading-tight sm:text-[38px]">
              {L('Four things the data tells us', 'أربعة أشياء تقولها البيانات')}
            </h2>
          </div>
          <Link to="/report" className="btn-link">
            {L('All results in the report', 'كل النتائج في التقرير')}
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
        <ol className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {findings.map((f, i) => (
            <li key={f.title} className="border-t-2 border-ink pt-5">
              <span className="serif text-[15px] font-semibold text-muted num">0{i + 1}</span>
              <h3 className="mt-1 text-[23px] leading-snug">{f.title}</h3>
              <p className="mt-3 text-[15.5px] leading-relaxed text-muted">{f.body}</p>
              <Link to={f.to} className="btn-link mt-4 text-[14px]">
                {L('See the analysis', 'شاهد التحليل')}
                <Icon name="arrow" className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Figures */}
      <section className="border-y border-line bg-band">
        <div className="wrap py-16 lg:py-20">
          <h2 className="text-[30px] leading-tight sm:text-[34px]">
            {L('A first look at the grades', 'نظرة أولى على العلامات')}
          </h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <figure className="rounded-card border border-line bg-surface p-6">
              <ChartFrame
                title={L('Most students score between 10 and 14', 'معظم الطلاب بين 10 و14')}
                desc={L('Histogram of the final grade', 'مدرج تكراري للعلامة النهائية')}
                width={640}
                height={290}
              >
                <HistogramSvg
                  values={A.raw.map((r) => r.G3)}
                  xLabel={L('Final grade G3 (0–20)', 'العلامة النهائية G3 (0–20)')}
                  yLabel={L('Students', 'الطلاب')}
                  height={290}
                  domain={[0, 19]}
                  colorFn={(b) => (b >= 10 ? 'var(--teal)' : 'var(--coral)')}
                  markers={[
                    {
                      x: g3.mean,
                      label: L(`mean ${fmt(g3.mean, 2)}`, `المتوسط ${fmt(g3.mean, 2)}`),
                      color: 'var(--ink)',
                      dashed: true,
                    },
                  ]}
                />
              </ChartFrame>
              <figcaption className="figure-note">
                <b className="text-ink">{L('Figure 2.', 'الشكل 2.')}</b>{' '}
                {L(
                  `Median ${g3.median}, mode ${g3.mode}, standard deviation ${fmt(g3.sd, 2)}. The bars at 0 are students who did not sit the final exam.`,
                  `الوسيط ${g3.median}، المنوال ${g3.mode}، الانحراف المعياري ${fmt(g3.sd, 2)}. الأعمدة عند 0 لطلاب لم يقدموا الامتحان النهائي.`,
                )}
              </figcaption>
            </figure>
            <figure className="rounded-card border border-line bg-surface p-6">
              <ChartFrame
                title={L('Each past failure lowers the grade', 'كل رسوب سابق ينزّل العلامة')}
                desc={L('Mean final grade by number of past failures', 'متوسط العلامة حسب عدد مرات الرسوب')}
                width={640}
                height={290}
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
                  xLabel={L('Number of past failures', 'عدد مرات الرسوب السابق')}
                  height={290}
                  yDomain={[0, 14]}
                  valueFormat={(v) => fmt(v, 2)}
                />
              </ChartFrame>
              <figcaption className="figure-note">
                <b className="text-ink">{L('Figure 3.', 'الشكل 3.')}</b>{' '}
                {L(
                  `Group sizes: ${A.by_fail.map((g) => `${g.level} failures: ${g.n}`).join(', ')} students.`,
                  `أحجام المجموعات: ${A.by_fail.map((g) => `${g.level} رسوب: ${g.n}`).join('، ')} طالبًا.`,
                )}
              </figcaption>
            </figure>
            <figure className="rounded-card border border-line bg-surface p-6 lg:col-span-2">
              <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                <ChartFrame
                  title={L('What moves with the final grade', 'ما الذي يتحرك مع العلامة النهائية')}
                  desc={L('Correlation of each variable with G3', 'ارتباط كل متغير مع G3')}
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
                <div className="text-[15.5px] leading-relaxed text-muted">
                  <p>
                    {L(
                      'Pearson correlation of each numeric variable with G3, leaving out the two earlier grades. Coral bars move against the grade: more past failures, more alcohol (weekday and weekend) and a longer journey to school all go with lower results. Teal bars move with it: study time and the parents’ education.',
                      'ارتباط بيرسون لكل متغير رقمي مع G3، دون العلامتين السابقتين. الأعمدة المرجانية تتحرك عكس العلامة: رسوب سابق أكثر، واستهلاك كحول أكثر (أيام الدراسة والعطلة)، وطريق أطول إلى المدرسة، وكلها مع نتائج أقل. والأعمدة الفيروزية تتحرك معها: وقت الدراسة وتعليم الوالدين.',
                    )}
                  </p>
                  <p className="mt-3">
                    {L(
                      'Correlation is not causation; the tests in chapter 4 check which of these differences are larger than chance.',
                      'الارتباط لا يعني السببية؛ اختبارات الفصل 4 تتحقق أي هذه الفروق أكبر من الصدفة.',
                    )}
                  </p>
                  <p className="figure-note">
                    <b className="text-ink">{L('Figure 4.', 'الشكل 4.')}</b> {L(SOURCE_EN, SOURCE_AR)}
                  </p>
                </div>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Chapters */}
      <section className="wrap py-16 lg:py-20">
        <p className="eyebrow">{L('How the analysis is organised', 'كيف ينتظم التحليل')}</p>
        <h2 className="mt-2 text-[32px] leading-tight sm:text-[38px]">
          {L('Eight chapters, in the order of our R script', 'ثمانية فصول بترتيب سكربت R')}
        </h2>
        <ol className="mt-10 grid border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => (
            <li
              key={s.path}
              className="border-b border-line sm:odd:border-e lg:border-e lg:[&:nth-child(4n)]:border-e-0"
            >
              <Link to={s.path} className="group block h-full p-6 hover:bg-band">
                <span className="serif text-[34px] font-semibold leading-none text-teal num">{s.step}</span>
                <h3 className="mt-4 text-[21px] group-hover:underline">{L(s.en, s.ar)}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  {s.about && L(s.about.en, s.about.ar)}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Ask */}
      <section className="border-t border-line bg-band">
        <div className="wrap grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:py-20">
          <div>
            <p className="eyebrow">{L('Ask the data', 'اسأل البيانات')}</p>
            <h2 className="mt-2 text-[30px] leading-tight sm:text-[34px]">
              {L('Have your own question? Run it here.', 'عندك سؤال؟ نفّذه هنا.')}
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-muted">
              {L(
                'Write a request in English or Arabic. The site picks the right method, runs it on all 649 students and shows the result, a chart, an explanation and the R code that gives the same answer.',
                'اكتب طلبك بالعربي أو بالإنجليزي. الموقع يختار الطريقة المناسبة، ويشغّلها على الـ 649 طالب، ويعرض النتيجة والرسم والتفسير وكود R الذي يعطي الجواب نفسه.',
              )}
            </p>
          </div>
          <AskBox />
        </div>
      </section>
    </div>
  );
}
