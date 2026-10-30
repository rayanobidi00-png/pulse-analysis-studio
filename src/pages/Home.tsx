import { Link } from 'react-router-dom';
import { HeroDots } from '../components/HeroDots';
import { Kpi, KpiStrip } from '../components/ui';
import { STAGES } from '../content/stages';
import { useLang } from '../i18n/lang';
import { fmt, pct } from '../lib/format';
import { useOverview } from '../state/analysis';

export default function Home() {
  const A = useOverview();
  const { L, dir } = useLang();
  const questions = [
    [
      'How are final grades distributed, and how many students fail?',
      'كيف تتوزع العلامات النهائية، وكم طالبًا يرسب؟',
      '/describe',
    ],
    [
      'Which background and study habits differ between students who pass and students who fail?',
      'ما العوامل الأسرية والعادات الدراسية التي تختلف بين الناجحين والراسبين؟',
      '/describe',
    ],
    [
      'Are the differences between groups (sex, school, study time, past failures) statistically significant?',
      'هل الفروق بين المجموعات (الجنس، المدرسة، وقت الدراسة، الرسوب السابق) ذات دلالة إحصائية؟',
      '/test',
    ],
    [
      'Can we predict the final grade, and flag students at risk, before any exam is written?',
      'هل يمكن التنبؤ بالعلامة النهائية وتحديد الطلاب المعرّضين للخطر قبل أي امتحان؟',
      '/model',
    ],
  ] as const;
  return (
    <div>
      <section className="relative mx-[calc(50%-50vw)] overflow-hidden bg-[#0B1222] px-4 pb-12 pt-10 text-[#E7ECF6] sm:pb-16 sm:pt-16">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_100%,rgba(46,196,174,0.16),transparent)]" />
        <div className="relative mx-auto max-w-[1240px]">
          <p className="eyebrow !text-[#2EC4AE]">{L('Data analysis and visualization project', 'مشروع تحليل البيانات وتصويرها')}</p>
          <div className="mt-6 grid items-end gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-7xl">
                {L('Every dot is', 'كل نقطة')}{' '}
                <span className="bg-gradient-to-r from-[#2EC4AE] to-[#7DE8D6] bg-clip-text text-transparent">
                  {L('a student.', 'هي طالب.')}
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-[#AEB8CC] sm:text-xl">
                {L(
                  `What decides a final grade? ${A.n_rows} students, ${A.n_cols} attributes, one question, analysed live in your browser.`,
                  `ما الذي يحدد العلامة النهائية؟ ${A.n_rows} طالبًا، ${A.n_cols} سمة، وسؤال واحد، نحلّله مباشرة في متصفحك.`,
                )}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/data" className="btn bg-[#2EC4AE] px-5 py-3 text-base text-[#06201C] hover:brightness-110">
                  {L('Start the analysis', 'ابدأ التحليل')} <span aria-hidden>{dir === 'rtl' ? '←' : '→'}</span>
                </Link>
                <Link to="/report" className="btn border border-[#2A3A5C] px-5 py-3 text-base text-[#E7ECF6] hover:bg-[#131B2E]">
                  {L('Read the report', 'اقرأ التقرير')}
                </Link>
              </div>
            </div>
            <div dir="ltr">
              <HeroDots grades={A.G3} />
              <p className="mt-2 flex flex-wrap gap-4 text-xs text-[#98A3BA]" dir={dir}>
                <span><i aria-hidden className="me-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#2EC4AE]" />{L(`Pass (G3 ≥ 10): ${A.pass_counts.Pass}`, `ناجح (G3 ≥ 10): ${A.pass_counts.Pass}`)}</span>
                <span><i aria-hidden className="me-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#FF6B55]" />{L(`Fail: ${A.pass_counts.Fail}`, `راسب: ${A.pass_counts.Fail}`)}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] py-12">
        <KpiStrip>
          <Kpi value={String(A.n_rows)} label={L('students', 'طالبًا')} />
          <Kpi value={String(A.n_cols)} label={L('columns', 'عمودًا')} />
          <Kpi value={String(A.total_na)} label={L('missing values', 'قيم مفقودة')} />
          <Kpi value={pct(A.pass_rate)} label={L('pass rate', 'نسبة النجاح')} tone="teal" />
          <Kpi value={fmt(A.meanG3, 2)} label={L('mean final grade', 'متوسط العلامة النهائية')} />
          <Kpi value={fmt(A.r_G2G3, 3)} label={L('r(G2, G3)', 'r(G2، G3)')} />
        </KpiStrip>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow">{L('Research question', 'سؤال البحث')}</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              {L('What decides whether a student passes Portuguese?', 'ما الذي يحدد نجاح الطالب في مادة اللغة البرتغالية؟')}
            </h2>
            <p className="mt-4 text-muted">
              {L(
                'We follow the path an analyst takes in R: import, inspect, clean, describe, test, model, visualize and report. Each step shows what we do and why, the live result, the R code from our course, the TypeScript that runs in your browser, and a plain interpretation.',
                'نتبع المسار الذي يسلكه المحلل في R: الاستيراد، الفحص، التنظيف، الوصف، الاختبار، النمذجة، التصوير، ثم التقرير. تعرض كل خطوة ما نفعله ولماذا، والنتيجة المحسوبة مباشرة، وكود R من المقرر، وكود TypeScript الذي يعمل في متصفحك، وتفسيرًا واضحًا.',
              )}
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {questions.map(([en, ar, to], i) => (
              <li key={to + i}>
                <Link to={to} className="card block h-full transition-colors hover:border-teal">
                  <span className="mono text-sm font-semibold text-teal">Q{i + 1}</span>
                  <p className="mt-2 font-medium">{L(en, ar)}</p>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-16">
          <p className="eyebrow">{L('The pipeline', 'مسار التحليل')}</p>
          <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STAGES.map((s) => (
              <li key={s.path}>
                <Link to={s.path} className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 hover:border-teal">
                  <span className="mono grid h-7 w-7 place-items-center rounded-full bg-tint text-xs font-bold text-teal">{s.step}</span>
                  <span className="font-semibold">{L(s.en, s.ar)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
