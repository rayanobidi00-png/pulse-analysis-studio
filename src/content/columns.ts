// Column dictionary for student-por.csv (meanings from Cortez & Silva, 2008).
// The R class is not stored here: it is derived from the parsed data (see rClass()).
import { INTEGER_COLUMNS, type ColumnName } from '../data/parse';

export type StatKind = 'nominal' | 'ordinal' | 'numeric';

export interface ColumnInfo {
  name: ColumnName;
  en: string;
  ar: string;
  /** Statistical type exactly as labelled in pulse_analysis.R. */
  statType: string;
  kind: StatKind;
  /** Optional decoding of codes for display. */
  codes?: Record<string, { en: string; ar: string }>;
}

const scale5 = { en: '1 = very low … 5 = very high', ar: '1 = منخفض جدًا … 5 = مرتفع جدًا' };

export const COLUMNS: ColumnInfo[] = [
  { name: 'school', en: "Student's school (GP = Gabriel Pereira, MS = Mousinho da Silveira)", ar: 'مدرسة الطالب (GP = غابرييل بيريرا، MS = موزينيو دا سيلفيرا)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'sex', en: "Student's sex (F = female, M = male)", ar: 'جنس الطالب (F = أنثى، M = ذكر)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'age', en: "Student's age in years (15–22)", ar: 'عمر الطالب بالسنوات (15–22)', statType: 'Numeric (discrete)', kind: 'numeric' },
  { name: 'address', en: 'Home address type (U = urban, R = rural)', ar: 'نوع منطقة السكن (U = حضري، R = ريفي)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'famsize', en: 'Family size (LE3 = 3 or fewer, GT3 = more than 3)', ar: 'حجم الأسرة (LE3 = ثلاثة أو أقل، GT3 = أكثر من ثلاثة)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'Pstatus', en: "Parents' cohabitation status (T = together, A = apart)", ar: 'حالة سكن الوالدين (T = معًا، A = منفصلان)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'Medu', en: "Mother's education (0 none, 1 primary 4th grade, 2 5th–9th, 3 secondary, 4 higher)", ar: 'تعليم الأم (0 بلا تعليم، 1 ابتدائي، 2 من الخامس إلى التاسع، 3 ثانوي، 4 جامعي)', statType: 'Ordinal (0-4)', kind: 'ordinal' },
  { name: 'Fedu', en: "Father's education (same 0–4 scale)", ar: 'تعليم الأب (نفس السلم 0–4)', statType: 'Ordinal (0-4)', kind: 'ordinal' },
  { name: 'Mjob', en: "Mother's job (teacher, health, services, at_home, other)", ar: 'عمل الأم (معلمة، صحة، خدمات، في المنزل، أخرى)', statType: 'Nominal', kind: 'nominal' },
  { name: 'Fjob', en: "Father's job (teacher, health, services, at_home, other)", ar: 'عمل الأب (معلم، صحة، خدمات، في المنزل، أخرى)', statType: 'Nominal', kind: 'nominal' },
  { name: 'reason', en: 'Reason for choosing the school (home, reputation, course, other)', ar: 'سبب اختيار المدرسة (قرب المنزل، السمعة، المنهاج، أخرى)', statType: 'Nominal', kind: 'nominal' },
  { name: 'guardian', en: "Student's guardian (mother, father, other)", ar: 'ولي أمر الطالب (الأم، الأب، آخر)', statType: 'Nominal', kind: 'nominal' },
  { name: 'traveltime', en: 'Home-to-school travel time (1 <15 min, 2 15–30 min, 3 30–60 min, 4 >1 h)', ar: 'وقت التنقل إلى المدرسة (1 أقل من 15 دقيقة، 2 من 15 إلى 30، 3 من 30 إلى 60، 4 أكثر من ساعة)', statType: 'Ordinal (1-4)', kind: 'ordinal' },
  { name: 'studytime', en: 'Weekly study time (1 <2 h, 2 2–5 h, 3 5–10 h, 4 >10 h)', ar: 'وقت الدراسة الأسبوعي (1 أقل من ساعتين، 2 من 2 إلى 5، 3 من 5 إلى 10، 4 أكثر من 10 ساعات)', statType: 'Ordinal (1-4)', kind: 'ordinal' },
  { name: 'failures', en: 'Number of past class failures (0–3; 3 means 3 or more)', ar: 'عدد مرات الرسوب السابقة (0–3؛ 3 تعني ثلاثًا أو أكثر)', statType: 'Numeric (discrete 0-3)', kind: 'numeric' },
  { name: 'schoolsup', en: 'Extra educational support from the school (yes/no)', ar: 'دعم تعليمي إضافي من المدرسة (نعم/لا)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'famsup', en: 'Family educational support (yes/no)', ar: 'دعم تعليمي من الأسرة (نعم/لا)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'paid', en: 'Extra paid classes in the course subject (yes/no)', ar: 'دروس خصوصية مدفوعة في المادة (نعم/لا)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'activities', en: 'Extra-curricular activities (yes/no)', ar: 'أنشطة لا منهجية (نعم/لا)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'nursery', en: 'Attended nursery school (yes/no)', ar: 'التحق بروضة أطفال (نعم/لا)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'higher', en: 'Wants to take higher education (yes/no)', ar: 'يرغب في التعليم الجامعي (نعم/لا)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'internet', en: 'Internet access at home (yes/no)', ar: 'إنترنت في المنزل (نعم/لا)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'romantic', en: 'In a romantic relationship (yes/no)', ar: 'في علاقة عاطفية (نعم/لا)', statType: 'Nominal (binary)', kind: 'nominal' },
  { name: 'famrel', en: `Quality of family relationships (${scale5.en})`, ar: `جودة العلاقات الأسرية (${scale5.ar})`, statType: 'Ordinal (1-5)', kind: 'ordinal' },
  { name: 'freetime', en: `Free time after school (${scale5.en})`, ar: `وقت الفراغ بعد المدرسة (${scale5.ar})`, statType: 'Ordinal (1-5)', kind: 'ordinal' },
  { name: 'goout', en: `Going out with friends (${scale5.en})`, ar: `الخروج مع الأصدقاء (${scale5.ar})`, statType: 'Ordinal (1-5)', kind: 'ordinal' },
  { name: 'Dalc', en: `Workday alcohol consumption (${scale5.en})`, ar: `استهلاك الكحول في أيام الدراسة (${scale5.ar})`, statType: 'Ordinal (1-5)', kind: 'ordinal' },
  { name: 'Walc', en: `Weekend alcohol consumption (${scale5.en})`, ar: `استهلاك الكحول في عطلة نهاية الأسبوع (${scale5.ar})`, statType: 'Ordinal (1-5)', kind: 'ordinal' },
  { name: 'health', en: 'Current health status (1 = very bad … 5 = very good)', ar: 'الحالة الصحية الحالية (1 = سيئة جدًا … 5 = جيدة جدًا)', statType: 'Ordinal (1-5)', kind: 'ordinal' },
  { name: 'absences', en: 'Number of school absences (0–93 possible)', ar: 'عدد أيام الغياب عن المدرسة (من 0 حتى 93 ممكنة)', statType: 'Numeric (discrete)', kind: 'numeric' },
  { name: 'G1', en: 'First-period grade (0–20)', ar: 'علامة الفترة الأولى (0–20)', statType: 'Numeric (0-20)', kind: 'numeric' },
  { name: 'G2', en: 'Second-period grade (0–20)', ar: 'علامة الفترة الثانية (0–20)', statType: 'Numeric (0-20)', kind: 'numeric' },
  { name: 'G3', en: 'Final grade (0–20), the target; pass = G3 ≥ 10', ar: 'العلامة النهائية (0–20)، المتغير الهدف؛ النجاح = G3 ≥ 10', statType: 'Numeric (0-20) - TARGET', kind: 'numeric' },
];

const INT = new Set<string>(INTEGER_COLUMNS);

/** class() in R after read.csv: integer for numeric columns, character otherwise. */
export function rClass(name: string): 'integer' | 'character' {
  return INT.has(name) ? 'integer' : 'character';
}

export function kindLabel(kind: StatKind, L: (en: string, ar: string) => string): string {
  return kind === 'nominal' ? L('Nominal', 'اسمي') : kind === 'ordinal' ? L('Ordinal', 'ترتيبي') : L('Numeric', 'رقمي');
}

/** Categorical columns usable in pickers (nominal + ordinal). */
export const CATEGORICAL = COLUMNS.filter((c) => c.kind !== 'numeric').map((c) => c.name);
export const BINARY = COLUMNS.filter((c) => c.statType === 'Nominal (binary)').map((c) => c.name);
export const NUMERIC_LIKE = COLUMNS.filter((c) => c.kind !== 'nominal').map((c) => c.name);
