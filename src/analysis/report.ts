// Builds the full written report from the live analysis, in either language.
// The same structure renders as the printable page and as Markdown.
import type { Analysis } from './compute';
import { TERM_LABELS } from '../content/terms';
import { COLUMNS, rClass } from '../content/columns';
import { fmt, fmtPPlain, pct } from '../lib/format';
import { FACTOR_CONVERTED } from '../data/clean';

type Lfn = (en: string, ar: string) => string;

export type ChartId = 'hist' | 'box-fail' | 'bar-mjob' | 'grouped' | 'pie' | 'scatter' | 'coef' | 'cor';

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; head: string[]; rows: (string | number)[][] }
  | { kind: 'chart'; id: ChartId; caption: string };

export interface ReportSection {
  id: string;
  title: string;
  blocks: Block[];
}

export function buildReport(A: Analysis, L: Lfn): ReportSection[] {
  const g3 = A.desc.find((d) => d.variable === 'G3')!;
  const kinds = { nominal: 0, ordinal: 0, numeric: 0 };
  COLUMNS.forEach((c) => kinds[c.kind]++);
  const dec = (p: number) => (p < 0.05 ? L('reject H0', 'نرفض H0') : L('do not reject H0', 'لا نرفض H0'));
  const term = (t: string) => L(TERM_LABELS[t]?.en ?? t, TERM_LABELS[t]?.ar ?? t);
  const conf = A.logit_confusion;
  const fails = conf.matrix[0][0] + conf.matrix[1][0];

  return [
    {
      id: 'intro',
      title: L('1. Introduction and research question', '1. المقدمة وسؤال البحث'),
      blocks: [
        { kind: 'p', text: L(
          `This report analyses the final Portuguese grades of ${A.n_rows} secondary-school students (UCI Student Performance data, Cortez & Silva, 2008). The research question is: what decides whether a student passes (G3 ≥ 10)? We describe the data, test differences between groups, and build models that could warn teachers early. Every number below was computed live from data/student-por.csv and checked against R.`,
          `يحلل هذا التقرير العلامات النهائية في مادة اللغة البرتغالية لـ ${A.n_rows} طالبًا في المرحلة الثانوية (بيانات أداء الطلاب من UCI، Cortez و Silva، 2008). سؤال البحث: ما الذي يحدد نجاح الطالب (G3 ≥ 10)؟ نصف البيانات، ونختبر الفروق بين المجموعات، ونبني نماذج يمكن أن تنذر المعلمين مبكرًا. كل رقم أدناه حُسب مباشرة من data/student-por.csv وتمت مطابقته مع R.`,
        ) },
      ],
    },
    {
      id: 'data',
      title: L('2. Data description', '2. وصف البيانات'),
      blocks: [
        { kind: 'p', text: L(
          `The file has ${A.n_rows} rows (students) and ${A.n_cols} columns: ${kinds.nominal} nominal, ${kinds.ordinal} ordinal and ${kinds.numeric} numeric. It was collected in 2005–2006 at two public schools in Portugal (domain: education). There are ${A.total_na} missing values and ${A.duplicates} duplicated rows.`,
          `يحتوي الملف على ${A.n_rows} صفًا (طالبًا) و${A.n_cols} عمودًا: ${kinds.nominal} اسميًا و${kinds.ordinal} ترتيبية و${kinds.numeric} رقمية. جُمعت البيانات في 2005–2006 في مدرستين حكوميتين في البرتغال (المجال: التعليم). لا توجد سوى ${A.total_na} قيمة مفقودة و${A.duplicates} صفوف مكررة.`,
        ) },
        { kind: 'table', head: [L('Column', 'العمود'), L('R class', 'صنف R'), L('Statistical type', 'النوع الإحصائي')], rows: COLUMNS.map((c) => [c.name, rClass(c.name), c.statType]) },
      ],
    },
    {
      id: 'clean',
      title: L('3. Cleaning and preprocessing', '3. التنظيف والمعالجة المسبقة'),
      blocks: [
        { kind: 'list', items: [
          L(`Missing values: ${A.total_na} in every column, so no imputation (median imputation or na.omit() would be used otherwise).`, `القيم المفقودة: ${A.total_na} في كل الأعمدة، فلا حاجة للتعويض (وإلا لاستخدمنا التعويض بالوسيط أو na.omit()).`),
          L(`Duplicates: ${A.duplicates}.`, `التكرار: ${A.duplicates}.`),
          L(`Zero final grades: ${A.zero_g3} students did not sit the final exam; kept as real fails.`, `العلامات الصفرية: ${A.zero_g3} طالبًا لم يتقدموا للامتحان النهائي؛ أُبقي عليهم بوصفهم راسبين فعلًا.`),
          L(`Absence outliers (IQR rule): Q1 = ${A.absences_q1}, Q3 = ${A.absences_q3}, upper fence ${A.absences_upper_fence}, ${A.absences_outliers} outliers; kept because they are plausible.`, `القيم المتطرفة للغياب (قاعدة IQR): Q1 = ${A.absences_q1}، Q3 = ${A.absences_q3}، الحد الأعلى ${A.absences_upper_fence}، ${A.absences_outliers} قيمة متطرفة؛ أُبقي عليها لأنها معقولة.`),
          L(`Type conversion: ${FACTOR_CONVERTED.length} text columns to factors; study time, failures (0/1/2+) and mother’s education to ordered factors.`, `تحويل الأنواع: ${FACTOR_CONVERTED.length} عمودًا نصيًا إلى عوامل؛ ووقت الدراسة والرسوب (0/1/2+) وتعليم الأم إلى عوامل مرتبة.`),
          L('Feature engineering: pass, grade_band, alcohol = Dalc + Walc, avg_grade.', 'هندسة الخصائص: pass وgrade_band وalcohol = Dalc + Walc وavg_grade.'),
          L('Standardization: z-scores of G3 and absences (mean 0, SD 1).', 'التوحيد المعياري: درجات z لـ G3 والغياب (المتوسط 0 والانحراف 1).'),
          L(`Normalization: absences scaled to [0, 1]. Result: students_clean with ${Object.keys(A.clean[0]).length} columns.`, `التطبيع: تحويل الغياب إلى المجال [0، 1]. النتيجة: students_clean بعدد ${Object.keys(A.clean[0]).length} عمودًا.`),
        ] },
      ],
    },
    {
      id: 'describe',
      title: L('4. Descriptive statistics', '4. الإحصاء الوصفي'),
      blocks: [
        { kind: 'table', head: [L('variable', 'المتغير'), 'mean', 'median', 'mode', 'sd', 'min', 'Q1', 'Q3', 'max', 'IQR'], rows: A.desc.map((d) => [d.variable, fmt(d.mean, 3), d.median, d.mode, fmt(d.sd, 3), d.min, d.q1, d.q3, d.max, d.IQR]) },
        { kind: 'p', text: L(
          `The mean final grade is ${fmt(g3.mean, 2)} (median ${g3.median}, mode ${g3.mode}, SD ${fmt(g3.sd, 2)}). ${A.pass_counts.Pass} students pass and ${A.pass_counts.Fail} fail (pass rate ${pct(A.pass_rate, 1)}).`,
          `متوسط العلامة النهائية ${fmt(g3.mean, 2)} (الوسيط ${g3.median}، المنوال ${g3.mode}، الانحراف المعياري ${fmt(g3.sd, 2)}). ينجح ${A.pass_counts.Pass} طالبًا ويرسب ${A.pass_counts.Fail} (نسبة النجاح ${pct(A.pass_rate, 1)}).`,
        ) },
        { kind: 'chart', id: 'hist', caption: L('Distribution of final grades', 'توزيع العلامات النهائية') },
        { kind: 'table', head: [L('Grade band', 'فئة العلامة'), 'n'], rows: Object.entries(A.grade_bands) },
        { kind: 'table', head: [L('Group', 'المجموعة'), 'n', L('mean G3', 'متوسط G3'), L('pass rate', 'نسبة النجاح')], rows: [
          ...A.by_study.map((g) => [L(`study ${g.level}`, `الدراسة ${g.level}`), g.n, fmt(g.mean_G3, 2), `${fmt(g.pass_rate, 1)}%`]),
          ...A.by_fail.map((g) => [L(`failures ${g.level}`, `الرسوب ${g.level}`), g.n, fmt(g.mean_G3, 2), `${fmt(g.pass_rate, 1)}%`]),
          ...A.by_higher.map((g) => [L(`higher = ${g.level}`, `التعليم الجامعي = ${g.level}`), g.n, fmt(g.mean_G3, 2), `${fmt(g.pass_rate, 1)}%`]),
        ] },
        { kind: 'chart', id: 'box-fail', caption: L('Final grade by past failures', 'العلامة النهائية حسب الرسوب السابق') },
        { kind: 'chart', id: 'bar-mjob', caption: L("Mean final grade by mother's job", 'متوسط العلامة النهائية حسب عمل الأم') },
        { kind: 'chart', id: 'grouped', caption: L('Pass rate by school and sex', 'نسبة النجاح حسب المدرسة والجنس') },
        { kind: 'chart', id: 'pie', caption: L('Pass vs fail', 'النجاح مقابل الرسوب') },
        { kind: 'p', text: L(
          `Correlation: G2 (r = ${fmt(A.r_G2G3, 3)}) and G1 (r = ${fmt(A.cor_G3.find((c) => c.variable === 'G1')!.r, 3)}) are by far the strongest; among background variables, past failures is the strongest (r = ${fmt(A.cor_test_fail.r, 3)}). Spearman ρ(studytime, G3) = ${fmt(A.spearman_study, 3)}.`,
          `الارتباط: G2 (r = ${fmt(A.r_G2G3, 3)}) وG1 (r = ${fmt(A.cor_G3.find((c) => c.variable === 'G1')!.r, 3)}) الأقوى بفارق كبير؛ ومن بين المتغيرات الخلفية، الرسوب السابق هو الأقوى (r = ${fmt(A.cor_test_fail.r, 3)}). معامل سبيرمان ρ(studytime، G3) = ${fmt(A.spearman_study, 3)}.`,
        ) },
        { kind: 'chart', id: 'cor', caption: L('Correlations with G3', 'الارتباطات مع G3') },
        { kind: 'chart', id: 'scatter', caption: L('G2 vs G3', 'G2 مقابل G3') },
      ],
    },
    {
      id: 'infer',
      title: L('5. Inferential statistics (α = 0.05)', '5. الإحصاء الاستدلالي (α = 0.05)'),
      blocks: [
        { kind: 'table', head: [L('Test', 'الاختبار'), L('Statistic', 'الإحصاءة'), 'df', 'p', L('Decision', 'القرار')], rows: [
          [L('One-sample t: G3 vs 10', 't لعينة واحدة: G3 مقابل 10'), `t = ${fmt(A.t_one.statistic, 3)}`, A.t_one.df, fmtPPlain(A.t_one.p), dec(A.t_one.p)],
          [L('Paired t: G3 − G1', 't للأزواج: G3 − G1'), `t = ${fmt(A.t_paired.statistic, 3)}`, A.t_paired.df, fmtPPlain(A.t_paired.p), dec(A.t_paired.p)],
          [L('Welch t: G3 by sex', 't لويلش: G3 حسب الجنس'), `t = ${fmt(A.t_sex.statistic, 3)}`, fmt(A.t_sex.df, 1), fmtPPlain(A.t_sex.p), dec(A.t_sex.p)],
          [L('Welch t: G3 by higher', 't لويلش: G3 حسب التعليم الجامعي'), `t = ${fmt(A.t_higher.statistic, 3)}`, fmt(A.t_higher.df, 1), fmtPPlain(A.t_higher.p), dec(A.t_higher.p)],
          [L('Welch t: G3 by school', 't لويلش: G3 حسب المدرسة'), `t = ${fmt(A.t_school.statistic, 3)}`, fmt(A.t_school.df, 1), fmtPPlain(A.t_school.p), dec(A.t_school.p)],
          [L('χ²: higher × pass', 'مربع كاي: التعليم الجامعي × النجاح'), `χ² = ${fmt(A.chi_higher.statistic, 3)}`, A.chi_higher.df, fmtPPlain(A.chi_higher.p), dec(A.chi_higher.p)],
          [L('χ²: school × pass', 'مربع كاي: المدرسة × النجاح'), `χ² = ${fmt(A.chi_school.statistic, 3)}`, A.chi_school.df, fmtPPlain(A.chi_school.p), dec(A.chi_school.p)],
          [L('χ²: sex × pass', 'مربع كاي: الجنس × النجاح'), `χ² = ${fmt(A.chi_sex.statistic, 3)}`, A.chi_sex.df, fmtPPlain(A.chi_sex.p), dec(A.chi_sex.p)],
          [L('ANOVA: G3 ~ study time', 'ANOVA: G3 ~ وقت الدراسة'), `F = ${fmt(A.anova_study.F, 3)}`, `${A.anova_study.df1}, ${A.anova_study.df2}`, fmtPPlain(A.anova_study.p), dec(A.anova_study.p)],
          [L('ANOVA: G3 ~ failures', 'ANOVA: G3 ~ الرسوب'), `F = ${fmt(A.anova_fail.F, 3)}`, `${A.anova_fail.df1}, ${A.anova_fail.df2}`, fmtPPlain(A.anova_fail.p), dec(A.anova_fail.p)],
          [L("ANOVA: G3 ~ mother's education", 'ANOVA: G3 ~ تعليم الأم'), `F = ${fmt(A.anova_medu.F, 3)}`, `${A.anova_medu.df1}, ${A.anova_medu.df2}`, fmtPPlain(A.anova_medu.p), dec(A.anova_medu.p)],
        ] },
        { kind: 'p', text: L(
          `The mean grade is clearly above the pass mark; grades rise slightly from G1 to G3 (mean change ${fmt(A.t_paired.estimate as number, 2)}). Girls, students who want higher education and Gabriel Pereira students score significantly higher. The sex × pass association is only just significant (p = ${fmtPPlain(A.chi_sex.p)}). Tukey HSD shows that one past failure already costs about ${fmt(Math.abs(A.tukey_fail[0].diff), 1)} points, while 1 and 2+ failures do not differ (p adj = ${fmt(A.tukey_fail[2].padj, 2)}).`,
          `المتوسط أعلى بوضوح من علامة النجاح؛ وترتفع العلامات قليلًا من G1 إلى G3 (متوسط التغير ${fmt(A.t_paired.estimate as number, 2)}). تحصل الطالبات والراغبون في التعليم الجامعي وطلاب مدرسة غابرييل بيريرا على علامات أعلى بدلالة إحصائية. أما الارتباط بين الجنس والنجاح فدالّ بالكاد (p = ${fmtPPlain(A.chi_sex.p)}). ويُظهر اختبار توكي أن رسوبًا واحدًا سابقًا يكلّف نحو ${fmt(Math.abs(A.tukey_fail[0].diff), 1)} نقطة، بينما لا يختلف الرسوب مرة عن مرتين فأكثر (p adj = ${fmt(A.tukey_fail[2].padj, 2)}).`,
        ) },
      ],
    },
    {
      id: 'model',
      title: L('6. Regression models', '6. نماذج الانحدار'),
      blocks: [
        { kind: 'p', text: L(
          `Simple regression: G3 = ${fmt(A.lm_simple.coef[0].estimate, 3)} + ${fmt(A.lm_simple.coef[1].estimate, 3)} × G2, R² = ${fmt(A.lm_simple.r2, 3)}. Accurate, but G2 arrives too late for prevention.`,
          `الانحدار البسيط: G3 = ${fmt(A.lm_simple.coef[0].estimate, 3)} + ${fmt(A.lm_simple.coef[1].estimate, 3)} × G2، وR² = ${fmt(A.lm_simple.r2, 3)}. نموذج دقيق، لكن G2 تأتي متأخرة جدًا للوقاية.`,
        ) },
        { kind: 'table', head: [L('Term', 'الحد'), L('Estimate', 'التقدير'), 'SE', 't', 'p'], rows: A.lm_multi.coef.map((c) => [term(c.term), fmt(c.estimate, 3), fmt(c.se, 3), fmt(c.t, 2), fmtPPlain(c.p)]) },
        { kind: 'chart', id: 'coef', caption: L('Early-warning model coefficients', 'معاملات نموذج الإنذار المبكر') },
        { kind: 'p', text: L(
          `Multiple regression without G1/G2: R² = ${fmt(A.lm_multi.r2, 3)}, adjusted R² = ${fmt(A.lm_multi.adj_r2, 3)}, F(${A.lm_multi.df1}, ${A.lm_multi.df2}) = ${fmt(A.lm_multi.F, 2)}, residual SE = ${fmt(A.lm_multi.sigma, 2)}. Useful but weak: two thirds of the variation stays unexplained.`,
          `الانحدار المتعدد دون G1/G2: R² = ${fmt(A.lm_multi.r2, 3)}، وR² المعدل = ${fmt(A.lm_multi.adj_r2, 3)}، وF(${A.lm_multi.df1}، ${A.lm_multi.df2}) = ${fmt(A.lm_multi.F, 2)}، والخطأ المعياري للبواقي = ${fmt(A.lm_multi.sigma, 2)}. نموذج مفيد لكنه ضعيف: يبقى ثلثا التباين دون تفسير.`,
        ) },
        { kind: 'p', text: L(
          `Logistic regression for pass: AIC = ${fmt(A.logit.aic, 2)}, likelihood-ratio χ² = ${fmt(A.logit.lr_chi, 1)} on ${A.logit.lr_df} df. At a 0.5 threshold the accuracy is ${pct(conf.accuracy, 1)}, barely above the ${pct(conf.baseline, 1)} of always predicting “Pass”, and it catches only ${conf.matrix[0][0]} of ${fails} actual fails. AUC = ${fmt(A.logit_roc.auc, 3)}: the ranking is useful, the 0.5 cut-off is not.`,
          `الانحدار اللوجستي للنجاح: AIC = ${fmt(A.logit.aic, 2)}، وإحصاءة نسبة الإمكان χ² = ${fmt(A.logit.lr_chi, 1)} بدرجات حرية ${A.logit.lr_df}. عند العتبة 0.5 تبلغ الدقة ${pct(conf.accuracy, 1)}، أي أعلى بالكاد من ${pct(conf.baseline, 1)} التي نحصل عليها بتوقع «ناجح» دائمًا، ولا يكتشف إلا ${conf.matrix[0][0]} من أصل ${fails} راسبين فعليين. AUC = ${fmt(A.logit_roc.auc, 3)}: الترتيب مفيد، أما العتبة 0.5 فلا.`,
        ) },
      ],
    },
    {
      id: 'conclusion',
      title: L('7. Conclusions and limitations', '7. الخلاصة والقيود'),
      blocks: [
        { kind: 'list', items: [
          L(`Past failures are the strongest early signal: ${fmt(A.by_fail[0].pass_rate, 1)}% pass with no failures vs ${fmt(A.by_fail[2].pass_rate, 1)}% with two or more.`, `الرسوب السابق أقوى إشارة مبكرة: ينجح ${fmt(A.by_fail[0].pass_rate, 1)}% ممن لم يرسبوا سابقًا مقابل ${fmt(A.by_fail[2].pass_rate, 1)}% ممن رسبوا مرتين فأكثر.`),
          L(`Wanting higher education, the school attended and weekly study time also matter; family background (mother’s education) matters less once these are known.`, `الرغبة في التعليم الجامعي والمدرسة ووقت الدراسة الأسبوعي مهمة أيضًا؛ أما الخلفية الأسرية (تعليم الأم) فتقل أهميتها عند معرفة هذه العوامل.`),
          L('Earlier grades predict the final grade almost perfectly, so the first exam is the most reliable warning.', 'العلامات السابقة تتنبأ بالعلامة النهائية بدقة شبه تامة، لذا فالامتحان الأول هو أوثق إنذار.'),
          L('Limitations: observational data (association, not causation); two schools in one region in 2005–2006; lifestyle variables are self-reported; the early-warning models are weak and should support, not replace, a teacher’s judgement.', 'القيود: بيانات رصدية (ارتباط لا سببية)؛ مدرستان في منطقة واحدة في 2005–2006؛ متغيرات نمط الحياة مُبلَّغ عنها ذاتيًا؛ ونماذج الإنذار المبكر ضعيفة ويجب أن تدعم حكم المعلم لا أن تحل محله.'),
        ] },
      ],
    },
  ];
}

export function reportToMarkdown(sections: ReportSection[], title: string, chartNote: (caption: string) => string): string {
  const esc = (s: string | number) => String(s).replace(/\|/g, '\\|');
  const out: string[] = [`# ${title}`, ''];
  for (const s of sections) {
    out.push(`## ${s.title}`, '');
    for (const b of s.blocks) {
      if (b.kind === 'p') out.push(b.text, '');
      else if (b.kind === 'list') out.push(...b.items.map((i) => `- ${i}`), '');
      else if (b.kind === 'chart') out.push(chartNote(b.caption), '');
      else {
        out.push(`| ${b.head.map(esc).join(' | ')} |`, `| ${b.head.map(() => '---').join(' | ')} |`);
        out.push(...b.rows.map((r) => `| ${r.map(esc).join(' | ')} |`), '');
      }
    }
  }
  return out.join('\n');
}
