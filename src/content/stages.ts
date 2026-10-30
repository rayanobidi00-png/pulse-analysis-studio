export interface Stage {
  path: string;
  en: string;
  ar: string;
  /** Pipeline stages are numbered 1-8; tools have no number. */
  step?: number;
  /** One-line summary used on the home page. */
  about?: { en: string; ar: string };
}

export const STAGES: Stage[] = [
  { path: '/data', en: 'Data', ar: 'البيانات', step: 1, about: { en: 'Import the CSV as read.csv() does and document all 33 columns: meaning, R class and statistical type.', ar: 'استيراد الملف كما تفعل read.csv() وتوثيق الأعمدة الـ 33: معناها وصنفها في R ونوعها الإحصائي.' } },
  { path: '/clean', en: 'Clean', ar: 'التنظيف', step: 2, about: { en: 'Missing values, duplicates, zero grades, outliers, factors, new features, z-scores and min–max scaling.', ar: 'القيم المفقودة والتكرار والعلامات الصفرية والقيم المتطرفة والعوامل والخصائص الجديدة والتوحيد والتطبيع.' } },
  { path: '/describe', en: 'Describe', ar: 'الوصف', step: 3, about: { en: 'Mean, median, mode and spread; frequency tables; group comparisons; the correlation matrix.', ar: 'المتوسط والوسيط والمنوال والتشتت، وجداول التكرار، ومقارنة المجموعات، ومصفوفة الارتباط.' } },
  { path: '/test', en: 'Test', ar: 'الاختبارات', step: 4, about: { en: 'One-sample and paired t-tests, Welch tests, chi-square, one-way ANOVA with Tukey HSD.', ar: 'اختبار t لعينة واحدة وللأزواج، واختبار ويلش، ومربع كاي، وتحليل التباين الأحادي مع توكي.' } },
  { path: '/model', en: 'Model', ar: 'النمذجة', step: 5, about: { en: 'Simple and multiple linear regression, and a logistic model for pass or fail, with diagnostics.', ar: 'الانحدار الخطي البسيط والمتعدد، ونموذج لوجستي للنجاح والرسوب، مع التشخيصات.' } },
  { path: '/visualize', en: 'Visualize', ar: 'التصوير', step: 6, about: { en: 'Histogram, box plot, bar, pie and scatter charts for any column, each with its interpretation.', ar: 'مدرج تكراري وصندوقي وأعمدة ودائري وانتشار لأي عمود، مع تفسير لكل رسم.' } },
  { path: '/predict', en: 'Predict', ar: 'التنبؤ', step: 7, about: { en: 'An early-warning calculator built on the fitted models, before any exam is written.', ar: 'حاسبة إنذار مبكر مبنية على النماذج، قبل أي امتحان.' } },
  { path: '/report', en: 'Report', ar: 'التقرير', step: 8, about: { en: 'The complete written report, generated from the live results, ready to print as PDF.', ar: 'التقرير الكامل مكتوبًا من النتائج المباشرة، جاهز للطباعة PDF.' } },
];

export const TOOLS: Stage[] = [
  { path: '/ask', en: 'Ask the data', ar: 'اسأل البيانات' },
  { path: '/r', en: 'Run it in R', ar: 'شغّله في R' },
  { path: '/about', en: 'About', ar: 'عن المشروع' },
];

export function nextStage(path: string): Stage | undefined {
  const i = STAGES.findIndex((s) => s.path === path);
  return i >= 0 ? STAGES[i + 1] : STAGES[0];
}
