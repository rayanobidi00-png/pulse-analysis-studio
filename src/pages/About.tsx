import { Link } from 'react-router-dom';
import { PageHeader, Section } from '../components/ui';
import { TEAM } from '../content/team';
import { useLang } from '../i18n/lang';
import { useAnalysis } from '../state/analysis';

export default function About() {
  const A = useAnalysis();
  const { L } = useLang();
  const links = [
    { to: '/report', label: L('Full report', 'التقرير الكامل'), internal: true },
    { to: TEAM.links.slides, label: L('Slides', 'العرض التقديمي'), internal: false },
    { to: TEAM.links.video, label: L('Video', 'الفيديو'), internal: false },
  ];
  return (
    <div>
      <PageHeader
        eyebrow={L('About the project', 'عن المشروع')}
        title={L('PULSE: Predicting and Understanding Learning Success in Education', 'PULSE: التنبؤ بالنجاح الدراسي وفهمه')}
        lead={L(
          `A university project for ${TEAM.course.en}. It reproduces our R analysis of ${A.n_rows} students live in the browser, so every result can be inspected, changed and re-checked.`,
          `مشروع جامعي لمقرر ${TEAM.course.ar}. يعيد إنتاج تحليلنا في R لبيانات ${A.n_rows} طالبًا مباشرة في المتصفح، بحيث يمكن فحص كل نتيجة وتغييرها والتحقق منها من جديد.`,
        )}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-bold">{L('Team', 'الفريق')}</h2>
          <ul className="mt-4 divide-y divide-line">
            {TEAM.members.map((m) => (
              <li key={m.name} className="flex justify-between gap-4 py-2">
                <span className="font-medium">{m.name}</span>
                {m.id && <span className="mono text-sm text-muted">{m.id}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">{L('Instructor', 'المحاضر')}: <span className="text-ink">{TEAM.instructor}</span></p>
          <p className="text-sm text-muted">{L('Course', 'المقرر')}: <span className="text-ink">{L(TEAM.course.en, TEAM.course.ar)}</span></p>
        </div>
        <div className="card">
          <h2 className="text-xl font-bold">{L('Deliverables', 'المخرجات')}</h2>
          <ul className="mt-4 space-y-2">
            {links.map((l) => (
              <li key={l.label}>
                {l.internal ? (
                  <Link to={l.to} className="text-teal underline-offset-4 hover:underline">{l.label}</Link>
                ) : l.to ? (
                  <a href={l.to} className="text-teal underline-offset-4 hover:underline" target="_blank" rel="noreferrer">{l.label}</a>
                ) : (
                  <span className="text-muted">{l.label} · {L('link to be added', 'سيُضاف الرابط')}</span>
                )}
              </li>
            ))}
            <li><Link to="/r" className="text-teal underline-offset-4 hover:underline">{L('R code (run it in the browser)', 'كود R (شغّله في المتصفح)')}</Link></li>
          </ul>
        </div>
      </div>

      <Section title={L('Data citation', 'مرجع البيانات')}>
        <div className="card text-sm" dir="ltr">
          <p>P. Cortez and A. Silva. Using Data Mining to Predict Secondary School Student Performance. In A. Brito and J. Teixeira (eds.), <i>Proceedings of 5th FUture BUsiness TEChnology Conference (FUBUTEC 2008)</i>, pp. 5–12, Porto, Portugal, April 2008, EUROSIS, ISBN 978-9077381-39-7.</p>
          <p className="mt-2 text-muted [overflow-wrap:anywhere]">UCI Machine Learning Repository: Student Performance (https://archive.ics.uci.edu/dataset/320/student+performance), file student-por.csv, licence CC BY 4.0.</p>
        </div>
      </Section>

      <Section title={L('Methodology', 'المنهجية')}>
        <ol className="grid gap-3 sm:grid-cols-2">
          {[
            [L('Import and inspect', 'الاستيراد والفحص'), L(`read.csv(sep = ";"), str(), types of all ${A.n_cols} columns.`, `read.csv(sep = ";") وstr() وأنواع جميع الأعمدة الـ ${A.n_cols}.`)],
            [L('Clean', 'التنظيف'), L('Missing values, duplicates, zero grades, IQR outliers, factors, new features, z-scores, min–max.', 'القيم المفقودة، التكرار، العلامات الصفرية، القيم المتطرفة، العوامل، الخصائص الجديدة، z، الحد الأدنى–الأعلى.')],
            [L('Describe', 'الوصف'), L('Mean, median, mode, SD, quartiles (type 7), frequencies, group summaries, Pearson and Spearman correlation.', 'المتوسط، الوسيط، المنوال، الانحراف، الربيعيات (النوع 7)، التكرارات، ملخصات المجموعات، ارتباط بيرسون وسبيرمان.')],
            [L('Test', 'الاختبار'), L('One-sample, paired and Welch t-tests; chi-square (no continuity correction); one-way ANOVA with Tukey HSD; α = 0.05.', 'اختبارات t لعينة واحدة وللأزواج ولويلش؛ مربع كاي (دون تصحيح)؛ ANOVA أحادي مع توكي؛ α = 0.05.')],
            [L('Model', 'النمذجة'), L('lm(G3 ~ G2), an early-warning lm without G1/G2, and a logistic glm for passing.', 'lm(G3 ~ G2)، ونموذج lm للإنذار المبكر دون G1/G2، ونموذج glm لوجستي للنجاح.')],
            [L('Verify', 'التحقق'), L('A TypeScript statistics engine recomputes everything in the browser; an automated test suite compares it with R’s results.json.', 'محرك إحصائي بلغة TypeScript يعيد حساب كل شيء في المتصفح؛ ومجموعة اختبارات آلية تقارنه بملف results.json من R.')],
          ].map(([t, d], i) => (
            <li key={t} className="card">
              <span className="mono text-xs font-semibold text-teal">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-1 font-bold">{t}</h3>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={L('Limitations', 'القيود')}>
        <ul className="card list-disc space-y-2 ps-10 text-sm">
          <li>{L('Observational data: the tests show associations, not causes.', 'بيانات رصدية: تُظهر الاختبارات ارتباطات لا أسبابًا.')}</li>
          <li>{L('Two public schools in one Portuguese region in 2005–2006: results may not transfer to other places or years.', 'مدرستان حكوميتان في منطقة برتغالية واحدة في 2005–2006: قد لا تنطبق النتائج على أماكن أو سنوات أخرى.')}</li>
          <li>{L('Lifestyle variables (alcohol, going out, study time) are self-reported and coarse 1–5 scales.', 'متغيرات نمط الحياة (الكحول، الخروج، وقت الدراسة) مُبلَّغ عنها ذاتيًا وعلى سلالم تقريبية من 1 إلى 5.')}</li>
          <li>{L('The early-warning models explain only a third of the variation and miss most failing students at the default threshold.', 'نماذج الإنذار المبكر تفسّر ثلث التباين فقط، وتفوّت معظم الراسبين عند العتبة الافتراضية.')}</li>
          <li>{L(`The ${A.zero_g3} zero grades are treated as real fails; a student who left the school would also appear as 0.`, `تُعامل العلامات الصفرية الـ ${A.zero_g3} بوصفها رسوبًا حقيقيًا؛ لكن الطالب الذي ترك المدرسة يظهر أيضًا بعلامة 0.`)}</li>
        </ul>
      </Section>

      <Section title={L('Built with', 'أُنجز باستخدام')}>
        <p className="text-sm text-muted">
          {L('R (dplyr, ggplot2, modeest, corrplot) · webR · React · TypeScript · Supabase (Postgres) · jStat · D3 · Tailwind CSS · Vite · Vitest · GitHub Pages / Cloudflare Pages.', 'R (dplyr وggplot2 وmodeest وcorrplot) · webR · React · TypeScript · Supabase (Postgres) · jStat · D3 · Tailwind CSS · Vite · Vitest · GitHub Pages / Cloudflare Pages.')}
        </p>
      </Section>
    </div>
  );
}
