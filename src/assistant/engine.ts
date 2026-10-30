// "Ask PULSE": turns a request typed in English or Arabic into an analysis on the 649 students.
// Pure functions only (no React), so the parser and every answer are unit-tested.
import { COLUMN_NAMES, INTEGER_COLUMNS, type ColumnName, type Student } from '../data/parse';
import {
  anovaOneWay, chiSqTest, corTest, crossTab, describe, fitLm, frequencies, groupBy, iqr, mean, quantile,
  tTestOne, tTestPaired, tTestWelch, tukeyHSD,
} from '../stats';
import { fmt, fmtP, pct } from '../lib/format';

export type Var = ColumnName | 'pass';
export type Bi = { en: string; ar: string };

export type Intent =
  | 'help' | 'clean' | 'missing' | 'duplicates' | 'outliers' | 'describe' | 'histogram' | 'boxplot' | 'bar' | 'pie'
  | 'scatter' | 'correlation' | 'compare' | 'onesample' | 'paired' | 'regression' | 'passrate' | 'count' | 'mean'
  | 'top' | 'sql';

export interface Filter { col: ColumnName | 'pass'; value: string }

export interface Parsed {
  intent: Intent;
  vars: Var[];
  filters: Filter[];
  number?: number;
  limit?: number;
  order?: 'desc' | 'asc';
  sql?: string;
}

export type ChartSpec =
  | { kind: 'histogram'; values: number[]; label: string; markers?: { x: number; label: string }[] }
  | { kind: 'box'; groups: { label: string; values: number[] }[]; xLabel: string; yLabel: string }
  | { kind: 'bar'; bars: { label: string; value: number }[]; yLabel: string; percent?: boolean }
  | { kind: 'pie'; slices: { label: string; value: number }[] }
  | { kind: 'scatter'; points: { x: number; y: number; fail: boolean }[]; xLabel: string; yLabel: string; fit: { a: number; b: number } };

export interface Answer {
  ok: boolean;
  title: Bi;
  summary: Bi;
  stats?: { label: Bi; value: string }[];
  table?: { head: string[]; rows: (string | number)[][] };
  chart?: ChartSpec;
  r?: string;
  parsed: Parsed;
}

// ---------------------------------------------------------------- vocabulary

const NUMERIC = new Set<string>(INTEGER_COLUMNS);
export const isNumeric = (v: Var) => v !== 'pass' && NUMERIC.has(v);

/** Aliases in English (lower case) and Arabic. Longest aliases are matched first. */
const ALIASES: Record<Var, string[]> = {
  school: ['school', 'schools', 'المدرسة', 'مدرسة', 'المدارس'],
  sex: ['sex', 'gender', 'الجنس', 'جنس'],
  age: ['age', 'العمر', 'عمر'],
  address: ['address', 'urban or rural', 'السكن', 'منطقة السكن'],
  famsize: ['family size', 'famsize', 'حجم الأسرة', 'حجم العائلة', 'حجم العيلة'],
  Pstatus: ['parents status', 'parent status', 'pstatus', 'حالة الوالدين', 'الوالدين'],
  Medu: ["mother's education", 'mother education', 'mothers education', 'medu', 'تعليم الأم', 'تعليم الام'],
  Fedu: ["father's education", 'father education', 'fathers education', 'fedu', 'تعليم الأب', 'تعليم الاب'],
  Mjob: ["mother's job", 'mother job', 'mothers job', 'mjob', 'وظيفة الأم', 'وظيفة الام', 'عمل الأم', 'عمل الام', 'شغل الأم', 'شغل الام'],
  Fjob: ["father's job", 'father job', 'fathers job', 'fjob', 'وظيفة الأب', 'وظيفة الاب', 'عمل الأب', 'عمل الاب', 'شغل الأب', 'شغل الاب'],
  reason: ['reason', 'سبب اختيار المدرسة', 'السبب', 'سبب'],
  guardian: ['guardian', 'ولي الأمر', 'ولي الامر'],
  traveltime: ['travel time', 'traveltime', 'commute', 'وقت المواصلات', 'المواصلات', 'وقت الطريق'],
  studytime: ['study time', 'studytime', 'studying', 'hours of study', 'ساعات الدراسة', 'وقت الدراسة', 'الدراسة', 'الدراسه', 'دراسة'],
  failures: ['past failures', 'failures', 'past failure', 'failed classes', 'الرسوب السابق', 'مرات الرسوب', 'رسوب سابق'],
  schoolsup: ['school support', 'schoolsup', 'extra support', 'دعم المدرسة', 'الدعم المدرسي'],
  famsup: ['family support', 'famsup', 'دعم الأهل', 'دعم العائلة', 'دعم الاسرة'],
  paid: ['paid classes', 'private lessons', 'paid', 'دروس خصوصية', 'دروس مدفوعة'],
  activities: ['activities', 'extracurricular', 'الأنشطة', 'الانشطة', 'نشاطات'],
  nursery: ['nursery', 'الحضانة', 'الروضة'],
  higher: ['higher education', 'university plans', 'university', 'higher', 'التعليم العالي', 'التعليم الجامعي', 'الجامعة', 'جامعة', 'الطموح'],
  internet: ['internet', 'الإنترنت', 'الانترنت', 'انترنت', 'إنترنت'],
  romantic: ['romantic', 'relationship status', 'in a relationship', 'العلاقة العاطفية', 'علاقة عاطفية'],
  famrel: ['family relations', 'famrel', 'family relationship', 'العلاقات العائلية', 'العلاقة مع الأهل'],
  freetime: ['free time', 'freetime', 'وقت الفراغ', 'الفراغ'],
  goout: ['going out', 'goout', 'go out', 'الطلعات', 'الخروج مع الأصحاب', 'الخروج'],
  Dalc: ['workday alcohol', 'weekday alcohol', 'dalc', 'alcohol', 'كحول أيام الدوام', 'الكحول', 'كحول'],
  Walc: ['weekend alcohol', 'walc', 'كحول الويكند', 'كحول نهاية الأسبوع'],
  health: ['health', 'الصحة', 'صحة'],
  absences: ['absences', 'absence', 'absent', 'الغياب', 'غياب', 'الغيابات'],
  G1: ['g1', 'first period', 'period 1', 'first grade', 'الفترة الأولى', 'علامة الفترة الأولى', 'الفترة الاولى'],
  G2: ['g2', 'second period', 'period 2', 'second grade', 'الفترة الثانية', 'علامة الفترة الثانية'],
  G3: ['g3', 'final grade', 'final grades', 'final mark', 'grades', 'grade', 'marks', 'mark', 'score', 'العلامة النهائية', 'العلامات', 'العلامة', 'علامة', 'علامات', 'المعدل'],
  pass: ['pass rate', 'pass or fail', 'pass/fail', 'passing', 'passed', 'pass', 'failing', 'failed', 'fail', 'نسبة النجاح', 'النجاح', 'الرسوب', 'نجاح', 'رسوب', 'نجحوا', 'رسبوا', 'ناجح', 'راسب'],
};

const LABEL: Record<Var, Bi> = Object.fromEntries(
  (Object.keys(ALIASES) as Var[]).map((k) => [k, { en: ALIASES[k][0], ar: ALIASES[k].find((a) => /[؀-ۿ]/.test(a)) ?? k }]),
) as Record<Var, Bi>;
LABEL.G3 = { en: 'final grade (G3)', ar: 'العلامة النهائية (G3)' };
LABEL.G1 = { en: 'period-1 grade (G1)', ar: 'علامة الفترة الأولى (G1)' };
LABEL.G2 = { en: 'period-2 grade (G2)', ar: 'علامة الفترة الثانية (G2)' };
LABEL.pass = { en: 'pass / fail', ar: 'النجاح / الرسوب' };
export const varLabel = (v: Var): Bi => LABEL[v];

/** Value words that act as filters (girls, GP, urban…). */
const VALUE_WORDS: { col: ColumnName | 'pass'; value: string; words: string[] }[] = [
  { col: 'sex', value: 'F', words: ['girls', 'girl', 'female', 'females', 'women', 'البنات', 'بنات', 'بنت', 'الإناث', 'الاناث', 'إناث'] },
  { col: 'sex', value: 'M', words: ['boys', 'boy', 'male', 'males', 'men', 'الشباب', 'شباب', 'الأولاد', 'الاولاد', 'ولد', 'شب', 'الذكور', 'ذكور'] },
  { col: 'school', value: 'GP', words: ['gp', 'gabriel pereira', 'gabriel', 'غابرييل'] },
  { col: 'school', value: 'MS', words: ['ms', 'mousinho', 'mousinho da silveira', 'موزينيو'] },
  { col: 'address', value: 'U', words: ['urban', 'city', 'المدينة', 'حضري'] },
  { col: 'address', value: 'R', words: ['rural', 'countryside', 'الريف', 'ريفي'] },
  { col: 'pass', value: 'pass', words: ['passed', 'pass', 'passing', 'نجحوا', 'نجحت', 'نجح', 'الناجحين', 'ناجح', 'ناجحين'] },
  { col: 'pass', value: 'fail', words: ['failed', 'fail', 'failing', 'رسبوا', 'رسبت', 'رسب', 'الراسبين', 'راسب', 'راسبين'] },
];

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

const KW: Record<string, string[]> = {
  help: ['help', 'what can you do', 'examples', 'مساعدة', 'شو بتعمل', 'شو بتقدر', 'أمثلة', 'امثلة'],
  clean: ['clean', 'cleaning', 'preprocess', 'نظف', 'نظّف', 'تنظيف', 'التنظيف'],
  missing: ['missing', ' na ', 'null', 'ناقصة', 'الناقصة', 'مفقودة', 'المفقودة', 'نواقص'],
  duplicates: ['duplicate', 'duplicates', 'duplicated', 'مكرر', 'مكررة', 'المكررة', 'المكرر', 'التكرار في الصفوف'],
  outliers: ['outlier', 'outliers', 'extreme', 'شاذ', 'شاذة', 'الشاذة', 'متطرفة'],
  histogram: ['histogram', 'distribution', 'هيستوغرام', 'هستوغرام', 'هيستوجرام', 'مدرج', 'توزيع'],
  boxplot: ['box plot', 'boxplot', 'box-plot', 'box', 'بوكس', 'صندوق', 'الصندوق'],
  pie: ['pie', 'دائري', 'دائرة', 'باي', 'كعكة'],
  bar: ['bar chart', 'bar', 'bars', 'column chart', 'أعمدة', 'اعمدة', 'بار', 'أعمده'],
  scatter: ['scatter', 'scatterplot', 'انتشار', 'نقاط'],
  correlation: ['correlation', 'correlate', 'correlated', 'association between', 'relationship between', 'relation between', 'ارتباط', 'الارتباط', 'العلاقة بين', 'علاقة بين'],
  compare: ['compare', 'comparison', 'difference', 'different', 'differ', 'affect', 'effect', 'impact', 'influence', 'depend', 'significant', 'test', 't-test', 'ttest', 'anova', 'chi', 'chi-square', 'قارن', 'مقارنة', 'فرق', 'الفرق', 'يأثر', 'بأثر', 'تأثير', 'يؤثر', 'اختبار', 'اختبر', 'دال', 'كاي', 'أنوفا', 'انوفا'],
  regression: ['regression', 'regress', 'linear model', 'predict', 'model', 'انحدار', 'نموذج', 'تنبأ', 'تنبؤ'],
  describe: ['describe', 'summary', 'summarize', 'statistics', 'stats', 'overview', 'وصف', 'صف', 'ملخص', 'لخص', 'إحصاء', 'احصاء', 'احصائيات', 'إحصائيات'],
  passrate: ['pass rate', 'نسبة النجاح', 'نسبة الرسوب', 'fail rate', 'failure rate'],
  count: ['how many', 'count', 'number of', 'كم ', 'عدد'],
  mean: ['average', 'mean', 'متوسط', 'المتوسط', 'معدل'],
  top: ['top', 'highest', 'most', 'lowest', 'least', 'أعلى', 'اعلى', 'أكثر', 'اكثر', 'أقل', 'اقل'],
  paired: ['paired', 'from g1 to g3', 'g1 to g3', 'g1 vs g3', 'improve', 'improved', 'مزدوج', 'تحسن', 'تحسنت'],
};

// ---------------------------------------------------------------- parser

function normalise(input: string): string {
  return ` ${input
    .toLowerCase()
    .replace(/[أإآ]/g, (c) => c) // keep hamza forms; aliases list both spellings
    .replace(/[؟?!.,،:;()"'«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

function findVars(text: string): Var[] {
  const all = (Object.keys(ALIASES) as Var[])
    .flatMap((v) => ALIASES[v].map((a) => ({ v, a: a.toLowerCase() })))
    .sort((x, y) => y.a.length - x.a.length);
  let t = text;
  const hits: { v: Var; at: number }[] = [];
  for (const { v, a } of all) {
    const isLatin = /^[a-z0-9' -]+$/.test(a);
    const re = isLatin ? new RegExp(`(^|[^a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z0-9])`) : null;
    let m: RegExpExecArray | null;
    let at: number;
    if (re) {
      m = re.exec(t);
      if (!m) continue;
      at = m.index + m[1].length;
    } else {
      at = t.indexOf(a);
      if (at < 0) continue;
    }
    hits.push({ v, at });
    t = t.slice(0, at) + ' '.repeat(a.length) + t.slice(at + a.length);
  }
  const seen = new Set<Var>();
  return hits.sort((x, y) => x.at - y.at).map((h) => h.v).filter((v) => (seen.has(v) ? false : (seen.add(v), true)));
}

function findFilters(text: string): Filter[] {
  const out: Filter[] = [];
  for (const vw of VALUE_WORDS) {
    if (vw.words.some((w) => (/^[a-z ]+$/.test(w) ? new RegExp(`(^|[^a-z])${w}(?=$|[^a-z])`).test(text) : text.includes(w)))) {
      if (!out.some((f) => f.col === vw.col)) out.push({ col: vw.col, value: vw.value });
    }
  }
  return out;
}

export function parseRequest(input: string): Parsed {
  const raw = input.trim();
  if (/^\s*(select|with)\s/i.test(raw)) return { intent: 'sql', vars: [], filters: [], sql: raw };
  const t = normalise(raw);
  let vars = findVars(t);
  // "higher than 10" is a comparison word, not the higher-education column.
  if (/(higher|lower|greater|more|less) than|above|below|أعلى من|اعلى من|أقل من|اقل من/.test(t) && !/higher education|university|الجامعة|التعليم العالي/.test(t))
    vars = vars.filter((v) => v !== 'higher');
  let filters = findFilters(t);
  const numMatch = t.match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/);
  const number = numMatch ? Number(numMatch[1]) : undefined;
  const k = (name: string) => has(t, KW[name]);

  // value words are filters, not variables (e.g. "girls" should not add 'sex' as a variable to compare
  // unless the user also says gender/sex).
  const filterOnly = filters.length > 0 && vars.length === 0;

  let intent: Intent;
  if (k('help') || raw.length === 0) intent = 'help';
  else if (k('missing')) intent = 'missing';
  else if (k('duplicates')) intent = 'duplicates';
  else if (k('outliers')) intent = 'outliers';
  else if (k('clean')) intent = 'clean';
  else if (k('histogram')) intent = 'histogram';
  else if (k('boxplot')) intent = 'boxplot';
  else if (k('pie')) intent = 'pie';
  else if (k('scatter')) intent = 'scatter';
  else if (k('bar')) intent = 'bar';
  else if (k('correlation')) intent = 'correlation';
  else if (k('paired') && vars.includes('G1')) intent = 'paired';
  else if (k('regression')) intent = 'regression';
  else if (k('passrate')) intent = 'passrate';
  else if (number !== undefined && (k('compare') || k('mean')) && vars.length <= 1 && /(than|from|vs|versus|above|below|عن|من|مقارنة ب)/.test(t) && !k('count'))
    intent = 'onesample';
  else if (k('compare')) intent = 'compare';
  else if (k('top')) intent = 'top';
  else if (k('count')) intent = 'count';
  else if (k('mean')) intent = 'mean';
  else if (k('describe')) intent = 'describe';
  else if (vars.length >= 2) intent = 'compare';
  else if (vars.length === 1) intent = 'describe';
  else if (filterOnly) intent = 'count';
  else intent = 'help';

  // A column being analysed is never also a filter (e.g. "related to passing").
  if (['compare', 'passrate', 'correlation', 'regression', 'describe', 'pie', 'bar', 'boxplot'].includes(intent))
    filters = filters.filter((f) => !vars.includes(f.col));
  // "pass" is only a variable when the user asks about passing itself.
  if (intent === 'count' || intent === 'mean' || intent === 'top') vars = vars.filter((v) => v !== 'pass');
  if (intent === 'passrate') vars = vars.filter((v) => v !== 'pass');

  const limit = intent === 'top' ? number ?? 10 : undefined;
  const order = intent === 'top' && /(lowest|least|أقل|اقل)/.test(t) ? 'asc' : 'desc';
  return { intent, vars, filters, number, limit, order };
}

// ---------------------------------------------------------------- data helpers

const valueOf = (s: Student, v: Var): string | number => (v === 'pass' ? (s.G3 >= 10 ? 'pass' : 'fail') : s[v]);
const numCol = (rows: readonly Student[], v: ColumnName) => rows.map((r) => Number(r[v]));
const strCol = (rows: readonly Student[], v: Var) => rows.map((r) => String(valueOf(r, v)));

function levelsOf(rows: readonly Student[], v: Var): string[] {
  const set = [...new Set(strCol(rows, v))];
  return isNumeric(v) ? set.sort((a, b) => Number(a) - Number(b)) : set.sort();
}

function applyFilters(rows: readonly Student[], filters: Filter[]): Student[] {
  return rows.filter((r) => filters.every((f) => String(valueOf(r, f.col)) === f.value));
}

const FILTER_LABEL: Record<string, Bi> = {
  'sex=F': { en: 'girls', ar: 'البنات' }, 'sex=M': { en: 'boys', ar: 'الشباب' },
  'school=GP': { en: 'Gabriel Pereira', ar: 'مدرسة GP' }, 'school=MS': { en: 'Mousinho da Silveira', ar: 'مدرسة MS' },
  'address=U': { en: 'urban students', ar: 'طلاب المدينة' }, 'address=R': { en: 'rural students', ar: 'طلاب الريف' },
  'pass=pass': { en: 'students who passed', ar: 'الناجحين' }, 'pass=fail': { en: 'students who failed', ar: 'الراسبين' },
};
const filterText = (fs: Filter[]): Bi => ({
  en: fs.map((f) => FILTER_LABEL[`${f.col}=${f.value}`]?.en ?? `${f.col} = ${f.value}`).join(', '),
  ar: fs.map((f) => FILTER_LABEL[`${f.col}=${f.value}`]?.ar ?? `${f.col} = ${f.value}`).join('، '),
});

const rFilter = (fs: Filter[]) =>
  fs.length === 0 ? 'df' : `subset(df, ${fs.map((f) => (f.col === 'pass' ? (f.value === 'pass' ? 'G3 >= 10' : 'G3 < 10') : `${f.col} == "${f.value}"`)).join(' & ')})`;

/** Pick the numeric response and the grouping factor from the variables the user named. */
function roles(vars: Var[]): { y?: ColumnName; g?: Var } {
  const nums = vars.filter(isNumeric) as ColumnName[];
  const cats = vars.filter((v) => !isNumeric(v));
  const continuous = ['G3', 'G2', 'G1', 'absences', 'age'];
  const y = (nums.find((v) => continuous.includes(v)) ?? (cats.length ? nums[0] : nums[0])) as ColumnName | undefined;
  const g = cats[0] ?? nums.find((v) => v !== y);
  return { y, g };
}

const bi = (en: string, ar: string): Bi => ({ en, ar });

// ---------------------------------------------------------------- runner

export const EXAMPLES: Bi[] = [
  bi('Clean the data', 'نظّف البيانات'),
  bi('Are there missing values?', 'في قيم ناقصة؟'),
  bi('Outliers in absences', 'القيم الشاذة في الغياب'),
  bi('Describe the final grade', 'وصف العلامة النهائية'),
  bi('Histogram of absences', 'ارسم هيستوغرام للغياب'),
  bi('Box plot of final grade by study time', 'بوكس بلوت للعلامة حسب ساعات الدراسة'),
  bi('Pie chart of mother\'s job', 'رسم دائري لوظيفة الأم'),
  bi('Scatter of G2 and G3', 'رسم انتشار بين G2 و G3'),
  bi('Does sex affect the final grade?', 'هل الجنس بأثر على العلامة؟'),
  bi('Compare final grade by school', 'قارن العلامة حسب المدرسة'),
  bi('Is higher education related to passing?', 'هل الجامعة مرتبطة بالنجاح؟'),
  bi('Correlation between failures and final grade', 'الارتباط بين الرسوب السابق والعلامة'),
  bi('Pass rate by school', 'نسبة النجاح حسب المدرسة'),
  bi('How many girls failed?', 'كم بنت رسبت؟'),
  bi('Average final grade of boys', 'متوسط علامة الشباب'),
  bi('Is the mean final grade higher than 10?', 'هل متوسط العلامة أعلى من 10؟'),
  bi('Did grades improve from G1 to G3?', 'هل تحسنت العلامات من G1 إلى G3؟'),
  bi('Regression of G3 on G2 and failures', 'انحدار العلامة على G2 والرسوب السابق'),
  bi('Top 10 absences', 'أعلى 10 بالغياب'),
];

export function answer(rows: readonly Student[], p: Parsed): Answer {
  const base = { parsed: p, ok: true } as const;
  const scope = applyFilters(rows, p.filters);
  const ft = filterText(p.filters);
  const scopeNote: Bi = p.filters.length ? bi(` (${ft.en}, n = ${scope.length})`, ` (${ft.ar}، n = ${scope.length})`) : bi('', '');
  const fail = (en: string, ar: string): Answer => ({ ...base, ok: false, title: bi('I need a bit more detail', 'محتاج توضيح بسيط'), summary: bi(en, ar) });
  if (p.filters.length && scope.length === 0) return fail('No students match that filter.', 'ما في طلاب بيطابقوا هالشرط.');

  switch (p.intent) {
    case 'help':
      return {
        ...base,
        title: bi('What I can do', 'شو بقدر أعمل'),
        summary: bi(
          'Ask me in English or Arabic. I can clean and check the data, describe any column, draw histograms, box plots, bar, pie and scatter charts, run t-tests, chi-square, ANOVA, correlation and regression, count and average with filters (girls, boys, GP, MS, passed, failed), and run SQL that starts with SELECT.',
          'اسألني بالعربي أو بالإنجليزي. بقدر أنظّف البيانات وأفحصها، أوصف أي عمود، أرسم هيستوغرام وبوكس بلوت وأعمدة ودائري وانتشار، أعمل اختبار t وكاي تربيع وANOVA وارتباط وانحدار، أحسب عدد ومتوسط مع شروط (بنات، شباب، GP، MS، ناجحين، راسبين)، وأشغّل SQL بيبلش بـ SELECT.',
        ),
      };

    case 'missing': {
      const na = COLUMN_NAMES.map((c) => [c, rows.filter((r) => { const v = r[c] as unknown; return v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v)); }).length] as [string, number]);
      const total = na.reduce((s, [, n]) => s + n, 0);
      return {
        ...base,
        title: bi('Missing values', 'القيم الناقصة'),
        summary: total === 0
          ? bi(`No missing values in any of the ${COLUMN_NAMES.length} columns (${rows.length} rows). Nothing to impute or remove.`, `ما في ولا قيمة ناقصة بأي عمود من الـ ${COLUMN_NAMES.length} عمود (${rows.length} صف). ما في داعي نعوّض أو نحذف.`)
          : bi(`${total} missing values found.`, `في ${total} قيمة ناقصة.`),
        stats: [{ label: bi('Rows', 'الصفوف'), value: String(rows.length) }, { label: bi('Columns', 'الأعمدة'), value: String(COLUMN_NAMES.length) }, { label: bi('Missing', 'ناقصة'), value: String(total) }],
        table: { head: ['column', 'NA'], rows: na },
        r: 'colSums(is.na(df))\nsum(is.na(df))',
      };
    }

    case 'duplicates': {
      const keys = rows.map((r) => COLUMN_NAMES.map((c) => r[c]).join('|'));
      const dup = keys.length - new Set(keys).size;
      return {
        ...base,
        title: bi('Duplicate rows', 'الصفوف المكررة'),
        summary: bi(`${dup} duplicated rows out of ${rows.length}: every student is a distinct record.`, `${dup} صف مكرر من أصل ${rows.length}: كل طالب سجل مستقل.`),
        stats: [{ label: bi('Duplicates', 'مكرر'), value: String(dup) }],
        r: 'sum(duplicated(df))',
      };
    }

    case 'outliers': {
      const v = (p.vars.find(isNumeric) as ColumnName | undefined) ?? 'absences';
      const x = numCol(scope, v);
      const q1 = quantile(x, 0.25), q3 = quantile(x, 0.75), q = iqr(x);
      const lo = q1 - 1.5 * q, hi = q3 + 1.5 * q;
      const out = x.filter((a) => a < lo || a > hi);
      const L = varLabel(v);
      return {
        ...base,
        title: bi(`Outliers in ${L.en}`, `القيم الشاذة في ${L.ar}`),
        summary: bi(
          `IQR rule: Q1 = ${fmt(q1)}, Q3 = ${fmt(q3)}, IQR = ${fmt(q)}, so the fences are ${fmt(lo)} and ${fmt(hi)}. ${out.length} of ${x.length} values fall outside${scopeNote.en}.`,
          `قاعدة IQR: Q1 = ${fmt(q1)}، Q3 = ${fmt(q3)}، IQR = ${fmt(q)}، فالحدود ${fmt(lo)} و ${fmt(hi)}. ${out.length} قيمة من ${x.length} برا الحدود${scopeNote.ar}.`,
        ),
        stats: [{ label: bi('Lower fence', 'الحد الأدنى'), value: fmt(lo) }, { label: bi('Upper fence', 'الحد الأعلى'), value: fmt(hi) }, { label: bi('Outliers', 'الشاذة'), value: String(out.length) }],
        chart: { kind: 'box', groups: [{ label: L.en, values: x }], xLabel: '', yLabel: v },
        r: `x <- ${rFilter(p.filters)}$${v}\nfence <- quantile(x, .75) + 1.5 * IQR(x)\nsum(x > fence | x < quantile(x, .25) - 1.5 * IQR(x))\nboxplot(x)`,
      };
    }

    case 'clean': {
      const keys = rows.map((r) => COLUMN_NAMES.map((c) => r[c]).join('|'));
      const dup = keys.length - new Set(keys).size;
      const zero = rows.filter((r) => r.G3 === 0).length;
      const abs = numCol(rows, 'absences');
      const fence = quantile(abs, 0.75) + 1.5 * iqr(abs);
      const outN = abs.filter((a) => a > fence).length;
      return {
        ...base,
        title: bi('Cleaning run: 4 checks', 'تنظيف البيانات: 4 فحوصات'),
        summary: bi(
          `Done. ${rows.length} rows × ${COLUMN_NAMES.length} columns. 0 missing values, ${dup} duplicates, ${zero} students with a final grade of 0 (kept as real fails), ${outN} absence outliers above ${fmt(fence)} (kept as real behaviour). No rows were removed.`,
          `خلصت. ${rows.length} صف × ${COLUMN_NAMES.length} عمود. 0 قيم ناقصة، ${dup} صفوف مكررة، ${zero} طالب علامتهم النهائية صفر (خليناهم لأنهم رسوب حقيقي)، ${outN} قيمة شاذة بالغياب فوق ${fmt(fence)} (خليناهم لأنهم سلوك حقيقي). ما انحذف ولا صف.`,
        ),
        table: {
          head: ['check', 'result', 'decision'],
          rows: [
            ['Missing values (is.na)', '0', 'nothing to impute'],
            ['Duplicated rows', String(dup), 'nothing to remove'],
            ['G3 = 0', String(zero), 'keep (missed final exam)'],
            [`Absences > ${fmt(fence)} (IQR)`, String(outN), 'keep (real behaviour)'],
          ],
        },
        r: 'sum(is.na(df))\nsum(duplicated(df))\nsum(df$G3 == 0)\nfence <- quantile(df$absences, .75) + 1.5 * IQR(df$absences)\nsum(df$absences > fence)',
      };
    }

    case 'histogram':
    case 'describe': {
      const v = p.vars[0] ?? 'G3';
      const L = varLabel(v);
      if (isNumeric(v)) {
        const x = numCol(scope, v as ColumnName);
        const d = describe(x);
        return {
          ...base,
          title: bi(`${p.intent === 'histogram' ? 'Histogram' : 'Summary'} of ${L.en}${scopeNote.en}`, `${p.intent === 'histogram' ? 'هيستوغرام' : 'وصف'} ${L.ar}${scopeNote.ar}`),
          summary: bi(
            `Mean ${fmt(d.mean)}, median ${fmt(d.median)}, mode ${fmt(d.mode, 0)}, SD ${fmt(d.sd)}, range ${fmt(d.min, 0)}–${fmt(d.max, 0)} (n = ${x.length}). ${d.mean > d.median + 0.2 ? 'The mean is above the median, so the distribution is right-skewed.' : d.mean < d.median - 0.2 ? 'The mean is below the median, so the distribution is left-skewed.' : 'Mean and median are close: roughly symmetric.'}`,
            `المتوسط ${fmt(d.mean)}، الوسيط ${fmt(d.median)}، المنوال ${fmt(d.mode, 0)}، الانحراف المعياري ${fmt(d.sd)}، المدى ${fmt(d.min, 0)}–${fmt(d.max, 0)} (n = ${x.length}). ${d.mean > d.median + 0.2 ? 'المتوسط أكبر من الوسيط، يعني التوزيع ملتوي لليمين.' : d.mean < d.median - 0.2 ? 'المتوسط أقل من الوسيط، يعني التوزيع ملتوي لليسار.' : 'المتوسط والوسيط قريبين: التوزيع تقريبًا متماثل.'}`,
          ),
          stats: [
            { label: bi('Mean', 'المتوسط'), value: fmt(d.mean) }, { label: bi('Median', 'الوسيط'), value: fmt(d.median) },
            { label: bi('Mode', 'المنوال'), value: fmt(d.mode, 0) }, { label: bi('SD', 'الانحراف'), value: fmt(d.sd) },
            { label: bi('Q1–Q3', 'الربيعيات'), value: `${fmt(d.q1)}–${fmt(d.q3)}` }, { label: bi('n', 'العدد'), value: String(x.length) },
          ],
          chart: { kind: 'histogram', values: x, label: L.en, markers: [{ x: d.mean, label: `mean ${fmt(d.mean)}` }] },
          r: `x <- ${rFilter(p.filters)}$${v}\nsummary(x); sd(x); modeest::mfv(x)\nggplot(data.frame(x), aes(x)) + geom_histogram(binwidth = 1)`,
        };
      }
      const f = frequencies(strCol(scope, v), levelsOf(scope, v));
      const top = [...f].sort((a, b) => b.n - a.n)[0];
      return {
        ...base,
        title: bi(`Frequencies of ${L.en}${scopeNote.en}`, `تكرارات ${L.ar}${scopeNote.ar}`),
        summary: bi(`Most common: "${top.level}" with ${top.n} students (${pct(top.pct / 100)}).`, `الأكثر: «${top.level}» بعدد ${top.n} طالب (${pct(top.pct / 100)}).`),
        table: { head: ['level', 'n', '%'], rows: f.map((r) => [r.level, r.n, fmt(r.pct)]) },
        chart: { kind: 'bar', bars: f.map((r) => ({ label: r.level, value: r.n })), yLabel: 'students' },
        r: `t <- table(${rFilter(p.filters)}$${v === 'pass' ? 'G3 >= 10' : v})\nt; prop.table(t)`,
      };
    }

    case 'pie':
    case 'bar': {
      const { y, g } = roles(p.vars);
      const cat = (p.vars.find((v) => !isNumeric(v)) ?? g ?? p.vars[0] ?? 'Mjob') as Var;
      const L = varLabel(cat);
      if (p.intent === 'bar' && y && cat && y !== cat) {
        const lv = levelsOf(scope, cat);
        const bars = lv.map((l) => ({ label: l, value: mean(scope.filter((r) => String(valueOf(r, cat)) === l).map((r) => Number(r[y]))) }));
        const best = [...bars].sort((a, b) => b.value - a.value)[0];
        const Y = varLabel(y);
        return {
          ...base,
          title: bi(`Mean ${Y.en} by ${L.en}${scopeNote.en}`, `متوسط ${Y.ar} حسب ${L.ar}${scopeNote.ar}`),
          summary: bi(`Highest mean: "${best.label}" (${fmt(best.value)}).`, `أعلى متوسط: «${best.label}» (${fmt(best.value)}).`),
          table: { head: [cat, `mean ${y}`], rows: bars.map((b) => [b.label, fmt(b.value)]) },
          chart: { kind: 'bar', bars, yLabel: `mean ${y}` },
          r: `${rFilter(p.filters)} %>% group_by(${cat}) %>% summarize(mean_${y} = mean(${y}))`,
        };
      }
      const f = frequencies(strCol(scope, cat), levelsOf(scope, cat));
      const top = [...f].sort((a, b) => b.n - a.n)[0];
      return {
        ...base,
        title: bi(`${p.intent === 'pie' ? 'Pie chart' : 'Bar chart'} of ${L.en}${scopeNote.en}`, `${p.intent === 'pie' ? 'رسم دائري' : 'رسم أعمدة'} لـ ${L.ar}${scopeNote.ar}`),
        summary: bi(`Largest group: "${top.level}" (${top.n}, ${pct(top.pct / 100)}).`, `أكبر فئة: «${top.level}» (${top.n}، ${pct(top.pct / 100)}).`),
        table: { head: ['level', 'n', '%'], rows: f.map((r) => [r.level, r.n, fmt(r.pct)]) },
        chart: p.intent === 'pie' ? { kind: 'pie', slices: f.map((r) => ({ label: r.level, value: r.n })) } : { kind: 'bar', bars: f.map((r) => ({ label: r.level, value: r.n })), yLabel: 'students' },
        r: p.intent === 'pie'
          ? `ggplot(${rFilter(p.filters)}, aes(x = "", fill = factor(${cat}))) + geom_bar(width = 1) + coord_polar("y")`
          : `ggplot(${rFilter(p.filters)}, aes(x = factor(${cat}))) + geom_bar()`,
      };
    }

    case 'boxplot': {
      const { y, g } = roles(p.vars);
      const yy = y ?? 'G3';
      const Y = varLabel(yy);
      if (!g || g === yy) {
        const x = numCol(scope, yy);
        return {
          ...base,
          title: bi(`Box plot of ${Y.en}${scopeNote.en}`, `بوكس بلوت لـ ${Y.ar}${scopeNote.ar}`),
          summary: bi(`Median ${fmt(quantile(x, 0.5))}, Q1 ${fmt(quantile(x, 0.25))}, Q3 ${fmt(quantile(x, 0.75))}.`, `الوسيط ${fmt(quantile(x, 0.5))}، Q1 ${fmt(quantile(x, 0.25))}، Q3 ${fmt(quantile(x, 0.75))}.`),
          chart: { kind: 'box', groups: [{ label: Y.en, values: x }], xLabel: '', yLabel: yy },
          r: `ggplot(${rFilter(p.filters)}, aes(y = ${yy})) + geom_boxplot()`,
        };
      }
      const G = varLabel(g);
      const lv = levelsOf(scope, g);
      const groups = lv.map((l) => ({ label: l, values: scope.filter((r) => String(valueOf(r, g)) === l).map((r) => Number(r[yy])) }));
      const means = groups.map((gr) => ({ l: gr.label, m: mean(gr.values) })).sort((a, b) => b.m - a.m);
      return {
        ...base,
        title: bi(`${Y.en} by ${G.en}${scopeNote.en}`, `${Y.ar} حسب ${G.ar}${scopeNote.ar}`),
        summary: bi(`Highest mean: "${means[0].l}" (${fmt(means[0].m)}); lowest: "${means[means.length - 1].l}" (${fmt(means[means.length - 1].m)}). Ask "compare ${yy} by ${g}" for the significance test.`, `أعلى متوسط: «${means[0].l}» (${fmt(means[0].m)})، وأقل متوسط: «${means[means.length - 1].l}» (${fmt(means[means.length - 1].m)}). اطلب «قارن ${yy} حسب ${g}» عشان الاختبار الإحصائي.`),
        chart: { kind: 'box', groups, xLabel: g, yLabel: yy },
        r: `ggplot(${rFilter(p.filters)}, aes(x = factor(${g}), y = ${yy})) + geom_boxplot()`,
      };
    }

    case 'scatter':
    case 'correlation': {
      const nums = p.vars.filter(isNumeric) as ColumnName[];
      if (nums.length < 2) {
        if (nums.length === 1 && p.intent === 'correlation') nums.push(nums[0] === 'G3' ? 'G2' : 'G3');
        else return fail('Name two numeric columns, for example "scatter of G2 and G3".', 'سمّي عمودين رقميين، مثلًا «انتشار بين G2 و G3».');
      }
      const [xv, yv] = nums.includes('G3') && nums[0] === 'G3' ? [nums[1], nums[0]] : [nums[0], nums[1]];
      const x = numCol(scope, xv), y = numCol(scope, yv);
      const ct = corTest(x, y);
      const lm = fitLm(x.map((a) => [1, a]), y, ['(Intercept)', xv]);
      const r = ct.r;
      const strength = Math.abs(r) > 0.7 ? ['very strong', 'قوية جدًا'] : Math.abs(r) > 0.4 ? ['moderate', 'متوسطة'] : Math.abs(r) > 0.2 ? ['weak', 'ضعيفة'] : ['very weak', 'ضعيفة جدًا'];
      return {
        ...base,
        title: bi(`${varLabel(xv).en} vs ${varLabel(yv).en}${scopeNote.en}`, `${varLabel(xv).ar} مقابل ${varLabel(yv).ar}${scopeNote.ar}`),
        summary: bi(
          `Pearson r = ${fmt(r, 3)} (${strength[0]}, ${r > 0 ? 'positive' : 'negative'}), p ${fmtP(ct.p)}. ${ct.p < 0.05 ? 'The relationship is statistically significant.' : 'Not significant at α = 0.05.'} Fitted line: ${yv} = ${fmt(lm.coef[0].estimate)} + ${fmt(lm.coef[1].estimate)} × ${xv} (R² = ${fmt(lm.r2, 3)}).`,
          `معامل بيرسون r = ${fmt(r, 3)} (علاقة ${strength[1]} و${r > 0 ? 'طردية' : 'عكسية'})، p ${fmtP(ct.p)}. ${ct.p < 0.05 ? 'العلاقة دالة إحصائيًا.' : 'مش دالة عند α = 0.05.'} خط الانحدار: ${yv} = ${fmt(lm.coef[0].estimate)} + ${fmt(lm.coef[1].estimate)} × ${xv} (R² = ${fmt(lm.r2, 3)}).`,
        ),
        stats: [{ label: bi('r', 'r'), value: fmt(r, 3) }, { label: bi('p-value', 'قيمة p'), value: fmtP(ct.p) }, { label: bi('95% CI', 'فترة الثقة'), value: `[${fmt(ct.ci[0], 3)}, ${fmt(ct.ci[1], 3)}]` }, { label: bi('R²', 'R²'), value: fmt(lm.r2, 3) }],
        chart: { kind: 'scatter', points: scope.map((s, i) => ({ x: x[i], y: y[i], fail: s.G3 < 10 })), xLabel: xv, yLabel: yv, fit: { a: lm.coef[0].estimate, b: lm.coef[1].estimate } },
        r: `d <- ${rFilter(p.filters)}\ncor.test(d$${xv}, d$${yv})\nggplot(d, aes(${xv}, ${yv})) + geom_jitter() + geom_smooth(method = "lm")`,
      };
    }

    case 'onesample': {
      const v = (p.vars.find(isNumeric) as ColumnName | undefined) ?? 'G3';
      const mu = p.number ?? 10;
      const x = numCol(scope, v);
      const t = tTestOne(x, mu);
      return {
        ...base,
        title: bi(`One-sample t-test: is mean ${v} different from ${mu}?`, `اختبار t لعينة واحدة: هل متوسط ${v} مختلف عن ${mu}؟`),
        summary: bi(
          `Mean = ${fmt(Number(t.estimate))} vs μ0 = ${mu}: t = ${fmt(t.statistic)}, df = ${fmt(t.df, 0)}, p ${fmtP(t.p)}. ${t.p < 0.05 ? `Reject H0: the mean is significantly ${Number(t.estimate) > mu ? 'above' : 'below'} ${mu}.` : 'Keep H0: no significant difference.'}`,
          `المتوسط = ${fmt(Number(t.estimate))} مقابل μ0 = ${mu}: t = ${fmt(t.statistic)}، df = ${fmt(t.df, 0)}، p ${fmtP(t.p)}. ${t.p < 0.05 ? `بنرفض H0: المتوسط ${Number(t.estimate) > mu ? 'أعلى' : 'أقل'} من ${mu} بشكل دال.` : 'ما بنرفض H0: ما في فرق دال.'}`,
        ),
        stats: [{ label: bi('t', 't'), value: fmt(t.statistic) }, { label: bi('df', 'df'), value: fmt(t.df, 0) }, { label: bi('p-value', 'قيمة p'), value: fmtP(t.p) }, { label: bi('95% CI', 'فترة الثقة'), value: `[${fmt(t.ci[0])}, ${fmt(t.ci[1])}]` }],
        chart: { kind: 'histogram', values: x, label: v, markers: [{ x: Number(t.estimate), label: `mean ${fmt(Number(t.estimate))}` }, { x: mu, label: `μ0 = ${mu}` }] },
        r: `t.test(${rFilter(p.filters)}$${v}, mu = ${mu})`,
      };
    }

    case 'paired': {
      const other = (p.vars.find((v) => v !== 'G1' && isNumeric(v)) as ColumnName | undefined) ?? 'G3';
      const a = numCol(scope, other), b = numCol(scope, 'G1');
      const t = tTestPaired(a, b);
      return {
        ...base,
        title: bi(`Paired t-test: ${other} vs G1`, `اختبار t المزدوج: ${other} مقابل G1`),
        summary: bi(
          `Mean change ${other} − G1 = ${fmt(Number(t.estimate), 3)}: t = ${fmt(t.statistic)}, df = ${fmt(t.df, 0)}, p ${fmtP(t.p)}. ${t.p < 0.05 ? 'The change is statistically significant.' : 'No significant change.'}`,
          `متوسط التغيّر ${other} − G1 = ${fmt(Number(t.estimate), 3)}: t = ${fmt(t.statistic)}، df = ${fmt(t.df, 0)}، p ${fmtP(t.p)}. ${t.p < 0.05 ? 'التغيّر دال إحصائيًا.' : 'ما في تغيّر دال.'}`,
        ),
        stats: [{ label: bi('Mean diff', 'متوسط الفرق'), value: fmt(Number(t.estimate), 3) }, { label: bi('t', 't'), value: fmt(t.statistic) }, { label: bi('p-value', 'قيمة p'), value: fmtP(t.p) }],
        chart: { kind: 'histogram', values: a.map((v, i) => v - b[i]), label: `${other} − G1`, markers: [{ x: 0, label: '0' }] },
        r: `t.test(${rFilter(p.filters)}$${other}, ${rFilter(p.filters)}$G1, paired = TRUE)`,
      };
    }

    case 'compare': {
      const vars = p.vars.length ? p.vars : [];
      const cats = vars.filter((v) => !isNumeric(v));
      // two categorical variables (or one + pass) → chi-square
      if (cats.length >= 2 || (cats.length === 1 && vars.length === 1 && cats[0] !== 'pass') || (cats.includes('pass') && cats.length >= 2)) {
        const a = cats[0] === 'pass' ? cats[1] ?? 'higher' : cats[0];
        const b: Var = cats.length >= 2 ? (cats[0] === 'pass' ? 'pass' : cats[1]) : 'pass';
        const la = levelsOf(scope, a), lb = levelsOf(scope, b);
        const obs = crossTab(strCol(scope, a), strCol(scope, b), la, lb).observed;
        const c = chiSqTest(obs, la, lb);
        return {
          ...base,
          title: bi(`Chi-square test: ${varLabel(a).en} × ${varLabel(b).en}`, `اختبار كاي تربيع: ${varLabel(a).ar} × ${varLabel(b).ar}`),
          summary: bi(
            `χ² = ${fmt(c.statistic)}, df = ${c.df}, p ${fmtP(c.p)}, Cramér's V = ${fmt(c.cramerV, 3)}. ${c.p < 0.05 ? 'Reject H0: the two variables are related.' : 'Keep H0: no evidence that they are related.'}${c.minExpected < 5 ? ' Some expected counts are below 5, so treat the p-value with care.' : ''}`,
            `χ² = ${fmt(c.statistic)}، df = ${c.df}، p ${fmtP(c.p)}، Cramér's V = ${fmt(c.cramerV, 3)}. ${c.p < 0.05 ? 'بنرفض H0: المتغيرين مرتبطين.' : 'ما بنرفض H0: ما في دليل على ارتباط.'}${c.minExpected < 5 ? ' بعض القيم المتوقعة أقل من 5، فخلي بالك من قيمة p.' : ''}`,
          ),
          stats: [{ label: bi('χ²', 'χ²'), value: fmt(c.statistic) }, { label: bi('df', 'df'), value: String(c.df) }, { label: bi('p-value', 'قيمة p'), value: fmtP(c.p) }, { label: bi("Cramér's V", "Cramér's V"), value: fmt(c.cramerV, 3) }],
          table: { head: [`${a} \\ ${b}`, ...lb], rows: la.map((l, i) => [l, ...obs[i]]) },
          chart: b === 'pass'
            ? { kind: 'bar', percent: true, yLabel: 'pass rate %', bars: la.map((l, i) => ({ label: l, value: (100 * obs[i][lb.indexOf('pass')]) / obs[i].reduce((s, n) => s + n, 0) })) }
            : undefined,
          r: `chisq.test(table(${rFilter(p.filters)}$${a === 'pass' ? 'G3 >= 10' : a}, ${rFilter(p.filters)}$${b === 'pass' ? 'G3 >= 10' : b}), correct = FALSE)`,
        };
      }
      const { y, g } = roles(vars.length ? vars : ['G3']);
      const yy = y ?? 'G3';
      if (!g || g === yy) return fail('Tell me what to compare, for example "compare final grade by sex".', 'احكيلي شو بدك تقارن، مثلًا «قارن العلامة حسب الجنس».');
      const lv = levelsOf(scope, g);
      const groups = groupBy(numCol(scope, yy), strCol(scope, g), lv);
      const box: ChartSpec = { kind: 'box', groups: groups.map((gr) => ({ label: gr.level, values: gr.values })), xLabel: g, yLabel: yy };
      if (groups.length === 2) {
        const t = tTestWelch(groups[0].values, groups[1].values);
        const [m1, m2] = t.estimate as [number, number];
        return {
          ...base,
          title: bi(`Welch two-sample t-test: ${yy} by ${g}`, `اختبار t لعينتين: ${yy} حسب ${g}`),
          summary: bi(
            `${groups[0].level}: ${fmt(m1)} vs ${groups[1].level}: ${fmt(m2)} (difference ${fmt(Math.abs(m1 - m2))}). t = ${fmt(t.statistic)}, df = ${fmt(t.df, 1)}, p ${fmtP(t.p)}, Cohen's d = ${fmt(Math.abs(t.d))}. ${t.p < 0.05 ? `Reject H0: ${g} is linked to ${yy}.` : `Keep H0: no significant difference in ${yy} by ${g}.`}`,
            `${groups[0].level}: ${fmt(m1)} مقابل ${groups[1].level}: ${fmt(m2)} (الفرق ${fmt(Math.abs(m1 - m2))}). t = ${fmt(t.statistic)}، df = ${fmt(t.df, 1)}، p ${fmtP(t.p)}، Cohen's d = ${fmt(Math.abs(t.d))}. ${t.p < 0.05 ? `بنرفض H0: ${g} مرتبط بـ ${yy}.` : `ما بنرفض H0: ما في فرق دال بـ ${yy} حسب ${g}.`}`,
          ),
          stats: [{ label: bi('t', 't'), value: fmt(t.statistic) }, { label: bi('df', 'df'), value: fmt(t.df, 1) }, { label: bi('p-value', 'قيمة p'), value: fmtP(t.p) }, { label: bi('95% CI', 'فترة الثقة'), value: `[${fmt(t.ci[0])}, ${fmt(t.ci[1])}]` }],
          chart: box,
          r: `t.test(${yy} ~ ${g}, data = ${rFilter(p.filters)})`,
        };
      }
      const a = anovaOneWay(groups);
      const tk = tukeyHSD(a);
      const best = [...a.groups].sort((x, z) => z.mean - x.mean);
      return {
        ...base,
        title: bi(`One-way ANOVA: ${yy} by ${g}`, `تحليل التباين الأحادي: ${yy} حسب ${g}`),
        summary: bi(
          `F = ${fmt(a.F)}, df = ${a.df1}, ${a.df2}, p ${fmtP(a.p)}, η² = ${fmt(a.eta2, 3)}. ${a.p < 0.05 ? `Reject H0: at least one group differs. Highest mean: "${best[0].level}" (${fmt(best[0].mean)}); lowest: "${best[best.length - 1].level}" (${fmt(best[best.length - 1].mean)}).` : 'Keep H0: the group means do not differ significantly.'}`,
          `F = ${fmt(a.F)}، df = ${a.df1}، ${a.df2}، p ${fmtP(a.p)}، η² = ${fmt(a.eta2, 3)}. ${a.p < 0.05 ? `بنرفض H0: على الأقل مجموعة مختلفة. أعلى متوسط «${best[0].level}» (${fmt(best[0].mean)})، وأقل متوسط «${best[best.length - 1].level}» (${fmt(best[best.length - 1].mean)}).` : 'ما بنرفض H0: متوسطات المجموعات ما بتختلف بشكل دال.'}`,
        ),
        stats: [{ label: bi('F', 'F'), value: fmt(a.F) }, { label: bi('df', 'df'), value: `${a.df1}, ${a.df2}` }, { label: bi('p-value', 'قيمة p'), value: fmtP(a.p) }, { label: bi('η²', 'η²'), value: fmt(a.eta2, 3) }],
        table: { head: ['Tukey pair', 'diff', 'p adj'], rows: tk.map((r) => [r.pair, fmt(r.diff), fmtP(r.padj)]) },
        chart: box,
        r: `a <- aov(${yy} ~ factor(${g}), data = ${rFilter(p.filters)})\nsummary(a)\nTukeyHSD(a)`,
      };
    }

    case 'regression': {
      const nums = p.vars.filter((v) => v !== 'pass');
      const yv = (nums.includes('G3') ? 'G3' : (nums.find(isNumeric) as ColumnName | undefined)) ?? 'G3';
      let xs = nums.filter((v) => v !== yv);
      if (xs.length === 0) xs = ['G2'];
      const design: { term: string; get: (s: Student) => number }[] = [];
      for (const v of xs) {
        if (isNumeric(v)) design.push({ term: v, get: (s) => Number(s[v as ColumnName]) });
        else {
          const lv = levelsOf(scope, v);
          for (const l of lv.slice(1)) design.push({ term: `${v}${l}`, get: (s) => (String(valueOf(s, v)) === l ? 1 : 0) });
        }
      }
      const X = scope.map((s) => [1, ...design.map((d) => d.get(s))]);
      const lm = fitLm(X, numCol(scope, yv as ColumnName), ['(Intercept)', ...design.map((d) => d.term)]);
      return {
        ...base,
        title: bi(`Linear regression: ${yv} ~ ${xs.join(' + ')}`, `انحدار خطي: ${yv} ~ ${xs.join(' + ')}`),
        summary: bi(
          `R² = ${fmt(lm.r2, 3)} (adjusted ${fmt(lm.adj_r2, 3)}): the model explains ${pct(lm.r2)} of the variation in ${yv}. F = ${fmt(lm.F)}, p ${fmtP(lm.p_overall)}. Typical error ±${fmt(lm.sigma)}.`,
          `R² = ${fmt(lm.r2, 3)} (المعدّل ${fmt(lm.adj_r2, 3)}): النموذج بيفسّر ${pct(lm.r2)} من التباين في ${yv}. F = ${fmt(lm.F)}، p ${fmtP(lm.p_overall)}. الخطأ المعتاد ±${fmt(lm.sigma)}.`,
        ),
        stats: [{ label: bi('R²', 'R²'), value: fmt(lm.r2, 3) }, { label: bi('Adj. R²', 'R² المعدّل'), value: fmt(lm.adj_r2, 3) }, { label: bi('F', 'F'), value: fmt(lm.F) }, { label: bi('p-value', 'قيمة p'), value: fmtP(lm.p_overall) }],
        table: { head: ['term', 'estimate', 'SE', 't', 'p'], rows: lm.coef.map((c) => [c.term, fmt(c.estimate, 3), fmt(c.se, 3), fmt(c.t), fmtP(c.p)]) },
        chart: design.length === 1 && isNumeric(xs[0])
          ? { kind: 'scatter', points: scope.map((s) => ({ x: Number(s[xs[0] as ColumnName]), y: Number(s[yv as ColumnName]), fail: s.G3 < 10 })), xLabel: xs[0], yLabel: yv, fit: { a: lm.coef[0].estimate, b: lm.coef[1].estimate } }
          : { kind: 'bar', yLabel: 'coefficient', bars: lm.coef.slice(1).map((c) => ({ label: c.term, value: c.estimate })) },
        r: `summary(lm(${yv} ~ ${xs.join(' + ')}, data = ${rFilter(p.filters)}))`,
      };
    }

    case 'passrate': {
      const g = (p.vars.find((v) => v !== 'G3') ?? 'school') as Var;
      const lv = levelsOf(scope, g);
      const bars = lv.map((l) => {
        const grp = scope.filter((r) => String(valueOf(r, g)) === l);
        return { label: l, value: (100 * grp.filter((r) => r.G3 >= 10).length) / grp.length, n: grp.length };
      });
      const best = [...bars].sort((a, b) => b.value - a.value);
      return {
        ...base,
        title: bi(`Pass rate by ${varLabel(g).en}${scopeNote.en}`, `نسبة النجاح حسب ${varLabel(g).ar}${scopeNote.ar}`),
        summary: bi(`Highest: "${best[0].label}" ${fmt(best[0].value, 1)}%; lowest: "${best[best.length - 1].label}" ${fmt(best[best.length - 1].value, 1)}%.`, `الأعلى: «${best[0].label}» ${fmt(best[0].value, 1)}%، والأقل: «${best[best.length - 1].label}» ${fmt(best[best.length - 1].value, 1)}%.`),
        table: { head: [g, 'n', 'pass rate %'], rows: bars.map((b) => [b.label, b.n, fmt(b.value, 1)]) },
        chart: { kind: 'bar', percent: true, yLabel: 'pass rate %', bars: bars.map((b) => ({ label: b.label, value: b.value })) },
        r: `${rFilter(p.filters)} %>% group_by(${g}) %>% summarize(pass_rate = 100 * mean(G3 >= 10))`,
      };
    }

    case 'count': {
      const n = scope.length;
      const label = p.filters.length ? ft : bi('students', 'طلاب');
      return {
        ...base,
        title: bi(`Count: ${label.en}`, `العدد: ${label.ar}`),
        summary: bi(`${n} of ${rows.length} students (${pct(n / rows.length)}).`, `${n} طالب من أصل ${rows.length} (${pct(n / rows.length)}).`),
        stats: [{ label: bi('Count', 'العدد'), value: String(n) }, { label: bi('Share', 'النسبة'), value: pct(n / rows.length) }],
        r: `nrow(${rFilter(p.filters)})`,
      };
    }

    case 'mean': {
      const v = (p.vars.find(isNumeric) as ColumnName | undefined) ?? 'G3';
      const x = numCol(scope, v);
      return {
        ...base,
        title: bi(`Average ${varLabel(v).en}${scopeNote.en}`, `متوسط ${varLabel(v).ar}${scopeNote.ar}`),
        summary: bi(`Mean ${fmt(mean(x))} (median ${fmt(quantile(x, 0.5))}, n = ${x.length}).`, `المتوسط ${fmt(mean(x))} (الوسيط ${fmt(quantile(x, 0.5))}، n = ${x.length}).`),
        stats: [{ label: bi('Mean', 'المتوسط'), value: fmt(mean(x)) }, { label: bi('n', 'العدد'), value: String(x.length) }],
        r: `mean(${rFilter(p.filters)}$${v})`,
      };
    }

    case 'top': {
      const v = (p.vars.find(isNumeric) as ColumnName | undefined) ?? 'G3';
      const lim = Math.min(50, Math.max(1, p.limit ?? 10));
      const sorted = scope.map((s, i) => ({ s, i })).sort((a, b) => (p.order === 'asc' ? Number(a.s[v]) - Number(b.s[v]) : Number(b.s[v]) - Number(a.s[v]))).slice(0, lim);
      return {
        ...base,
        title: bi(`${p.order === 'asc' ? 'Lowest' : 'Highest'} ${lim} by ${v}${scopeNote.en}`, `${p.order === 'asc' ? 'أقل' : 'أعلى'} ${lim} حسب ${v}${scopeNote.ar}`),
        summary: bi(`Sorted ${p.order === 'asc' ? 'ascending' : 'descending'} by ${v}.`, `مرتبين ${p.order === 'asc' ? 'تصاعديًا' : 'تنازليًا'} حسب ${v}.`),
        table: { head: ['#', 'school', 'sex', 'age', v, 'G3'], rows: sorted.map(({ s, i }) => [i + 1, s.school, s.sex, s.age, Number(s[v]), s.G3]) },
        r: `head(${rFilter(p.filters)}[order(${p.order === 'asc' ? '' : '-'}${rFilter(p.filters)}$${v}), ], ${lim})`,
      };
    }

    case 'sql':
      return { ...base, title: bi('SQL query', 'استعلام SQL'), summary: bi('Running on the in-browser SQLite table students_raw.', 'بيشتغل على جدول students_raw بقاعدة SQLite داخل المتصفح.') };
  }
}
