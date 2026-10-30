import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Database } from 'sql.js';
import { ChartFrame, LegendItem } from '../components/charts/ChartFrame';
import { BoxPlotSvg, HistogramSvg, VBarSvg } from '../components/charts/Charts';
import { Caveat, CodeTabs, Interp, NextStep, PageHeader, Section, SimpleTable, Stat, Toggle, type CodeTab } from '../components/ui';
import { rBetween } from '../content/rcode';
import { ADDED_COLUMNS, BAND_LABELS, FACTOR_CONVERTED, FAIL_LABELS, MEDU_LABELS, STUDY_LABELS } from '../data/clean';
import { DUPLICATES_SQL, FACTOR_SQL, FEATURE_SQL, MINMAX_SQL, NA_CHECK_SQL, OUTLIER_SQL, ZERO_G3_SQL, ZSCORE_SQL } from '../data/cleanSql';
import { runQuery } from '../data/db';
import { COLUMN_NAMES } from '../data/parse';
import { useLang } from '../i18n/lang';
import { fmt } from '../lib/format';
import { mulberry32 } from '../lib/random';
import { extractFn } from '../lib/source';
import { useAnalysis } from '../state/analysis';
import { useDb } from '../state/useDb';
import { mean, median, sd } from '../stats/descriptive';
import cleanSrc from '../data/clean.ts?raw';
import descSrc from '../stats/descriptive.ts?raw';
import parseSrc from '../data/parse.ts?raw';

type L = (en: string, ar: string) => string;

function columnCount(db: Database, table: string): number {
  return runQuery(db, `SELECT COUNT(*) FROM pragma_table_info('${table}')`).values[0][0] as number;
}

/** Damages a copy of three numeric columns (5% NA each) and shows what imputation and na.omit() do. */
const DAMAGED = ['G3', 'absences', 'age'] as const;

function MissingDemo({ L }: { L: L }) {
  const A = useAnalysis();
  const demo = useMemo(() => {
    const rnd = mulberry32(2024);
    const damaged = A.raw.map((r) => Object.fromEntries(DAMAGED.map((c) => [c, rnd() < 0.05 ? null : r[c]])) as Record<(typeof DAMAGED)[number], number | null>);
    const rowsComplete = damaged.filter((r) => DAMAGED.every((c) => r[c] !== null)).length;
    return {
      rowsComplete,
      stats: DAMAGED.map((c) => {
        const orig = A.raw.map((r) => r[c]);
        const present = damaged.map((r) => r[c]).filter((v): v is number => v !== null);
        const med = median(present);
        const imputed = damaged.map((r) => r[c] ?? med);
        return { c, na: damaged.length - present.length, origMean: mean(orig), med, impMean: mean(imputed), origSd: sd(orig), impSd: sd(imputed) };
      }),
    };
  }, [A.raw]);
  return (
    <div className="fade-up mt-4 rounded-lg border border-dashed border-amber p-4">
      <p className="text-sm font-semibold">{L('Simulation on a damaged copy (seed 2024): 5% of G3, absences and age set to NA', 'محاكاة على نسخة متضررة (البذرة 2024): جعلنا 5% من قيم G3 والغياب والعمر مفقودة')}</p>
      <div className="mt-3">
        <SimpleTable
          head={[L('Column', 'العمود'), 'NA', L('Median used', 'الوسيط المستخدم'), L('Mean: original', 'المتوسط: الأصلي'), L('Mean: imputed', 'المتوسط: بعد التعويض'), L('SD: original', 'الانحراف: الأصلي'), L('SD: imputed', 'الانحراف: بعد التعويض')]}
          rows={demo.stats.map((s) => [s.c, s.na, fmt(s.med, 1), fmt(s.origMean, 3), fmt(s.impMean, 3), fmt(s.origSd, 3), fmt(s.impSd, 3)])}
          numeric={[1, 2, 3, 4, 5, 6]}
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        {L(
          `na.omit() would keep only ${demo.rowsComplete} of ${A.n_rows} rows (${A.n_rows - demo.rowsComplete} lost). Median imputation keeps every row but shrinks the spread slightly (lower SD), which is why we would only use it when data are really missing.`,
          `ستُبقي na.omit() على ${demo.rowsComplete} صفًا فقط من أصل ${A.n_rows} (ضياع ${A.n_rows - demo.rowsComplete} صفًا). أما التعويض بالوسيط فيحافظ على كل الصفوف لكنه يقلل التشتت قليلًا (انحراف معياري أقل)، ولهذا لا نستخدمه إلا عند وجود قيم مفقودة فعلًا.`,
        )}
      </p>
    </div>
  );
}

interface StepDef {
  n: number;
  title: string;
  what: string;
  decision: string;
  reason: string;
  code: CodeTab[];
  /** Runs the step's SQL and returns before/after column counts plus rendered result. */
  run: (db: Database) => { before: string; after: string; body: ReactNode };
}

function StepCard({ step, result, onRun, ready }: { step: StepDef; result?: { before: string; after: string; body: ReactNode }; onRun: () => void; ready: boolean }) {
  const { L } = useLang();
  return (
    <article className="card relative overflow-hidden" aria-labelledby={`step-${step.n}`}>
      <span aria-hidden className={`absolute inset-y-0 start-0 w-1 ${result ? 'bg-teal' : 'bg-line'}`} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span aria-hidden className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-display text-lg font-extrabold ${result ? 'bg-tint text-teal' : 'bg-soft text-muted'}`}>
            {result ? '✓' : String(step.n).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="mono text-[11.5px] font-semibold uppercase tracking-[0.12em] text-teal">{L('Step', 'الخطوة')} {step.n} / 8</p>
            <h2 id={`step-${step.n}`} className="mt-1 text-[21px] font-bold leading-snug">{step.title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted">{step.what}</p>
          </div>
        </div>
        <button type="button" className={result ? 'btn-ghost' : 'btn-primary'} onClick={onRun} disabled={!ready}>
          {result ? L('Run again', 'تشغيل مجددًا') : L('Run step', 'تشغيل الخطوة')}
        </button>
      </div>
      {result && (
        <div className="fade-up mt-6 grid gap-6 border-t border-line pt-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label={L('Before', 'قبل')} value={result.before} />
              <Stat label={L('After', 'بعد')} value={result.after} />
            </div>
            {result.body}
            <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
              <span className="mono w-fit rounded-full bg-[var(--navy)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2ec4ae]">{L('Decision', 'القرار')}</span>
              <div className="text-sm">
                <p className="font-semibold text-ink">{step.decision}</p>
                <p className="mt-1 text-muted">{step.reason}</p>
              </div>
            </div>
          </div>
          <CodeTabs tabs={step.code} />
        </div>
      )}
    </article>
  );
}

export default function Clean() {
  const A = useAnalysis();
  const { L } = useLang();
  const { db } = useDb();
  const [results, setResults] = useState<Record<number, ReturnType<StepDef['run']>>>({});
  const [simulate, setSimulate] = useState(false);
  const g3 = A.raw.map((r) => r.G3);
  const abs = A.raw.map((r) => r.absences);
  const sdG3 = sd(g3);
  const shape = (rows: number, cols: number) => `${rows} × ${cols}`;

  const steps: StepDef[] = [
    {
      n: 1,
      title: L('Missing values', 'القيم المفقودة'),
      what: L('Count NA in every column.', 'نعدّ القيم المفقودة (NA) في كل عمود.'),
      decision: L('Nothing to impute.', 'لا حاجة إلى التعويض.'),
      reason: L(
        `There are ${A.total_na} missing values in all ${A.n_cols} columns. Imputing or dropping rows would only add noise; the toggle below shows what we would do on damaged data.`,
        `لا توجد سوى ${A.total_na} قيمة مفقودة في جميع الأعمدة الـ ${A.n_cols}. التعويض أو حذف الصفوف لن يضيف إلا تشويشًا؛ ويوضح المفتاح أدناه ما كنا سنفعله لو كانت البيانات متضررة.`,
      ),
      code: [
        { label: 'SQL', lang: 'sql', code: NA_CHECK_SQL },
        { label: 'R', lang: 'r', code: rBetween('na_per_col <-', '# Special case') },
        { label: 'TypeScript', lang: 'ts', code: extractFn(parseSrc, 'countNA') },
      ],
      run: (db) => {
        const r = runQuery(db, NA_CHECK_SQL);
        const total = r.values[0].reduce<number>((s, v) => s + Number(v), 0);
        return {
          before: `${shape(A.n_rows, A.n_cols)} · NA ${total}`,
          after: shape(A.n_rows, A.n_cols),
          body: (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6" dir="ltr">
              {r.columns.map((c, i) => (
                <div key={c} className="rounded bg-tint px-2 py-1 text-center">
                  <div className="mono truncate text-xs text-muted">{c}</div>
                  <div className="mono text-sm font-semibold text-teal">{String(r.values[0][i])}</div>
                </div>
              ))}
            </div>
          ),
        };
      },
    },
    {
      n: 2,
      title: L('Duplicate rows', 'الصفوف المكررة'),
      what: L(`Look for rows that are identical in all ${A.n_cols} columns.`, `نبحث عن صفوف متطابقة في جميع الأعمدة الـ ${A.n_cols}.`),
      decision: L('Nothing to remove.', 'لا شيء للحذف.'),
      reason: L(`duplicated(df) finds ${A.duplicates} duplicated rows, so every row is a distinct student.`, `تجد duplicated(df) عدد ${A.duplicates} صفوف مكررة، فكل صف طالب مختلف.`),
      code: [
        { label: 'SQL', lang: 'sql', code: DUPLICATES_SQL },
        { label: 'R', lang: 'r', code: 'cat("Duplicated rows :", sum(duplicated(df)), "\\n")' },
        { label: 'TypeScript', lang: 'ts', code: extractFn(parseSrc, 'countDuplicates') },
      ],
      run: (db) => {
        const d = Number(runQuery(db, DUPLICATES_SQL).values[0][0]);
        return { before: L(`${A.n_rows} rows · ${d} duplicates`, `${A.n_rows} صفًا · ${d} مكرر`), after: L(`${A.n_rows - d} rows`, `${A.n_rows - d} صفًا`), body: null };
      },
    },
    {
      n: 3,
      title: L('Zero final grades', 'العلامات النهائية الصفرية'),
      what: L('Find students with G3 = 0 and check their earlier grades.', 'نجد الطلاب الذين علامتهم G3 = 0 ونفحص علاماتهم السابقة.'),
      decision: L('Keep them as real fails.', 'نُبقيهم بوصفهم حالات رسوب حقيقية.'),
      reason: L(
        `${A.zero_g3} students have G3 = 0 although most had non-zero G1 and G2: they did not sit the final exam. A 0 is a real outcome; deleting them would hide failure and bias the pass rate upwards.`,
        `لدى ${A.zero_g3} طالبًا G3 = 0 رغم أن معظمهم حصل على علامات غير صفرية في G1 وG2: أي أنهم لم يتقدموا للامتحان النهائي. الصفر نتيجة حقيقية، وحذفهم سيخفي الرسوب ويرفع نسبة النجاح بشكل مضلل.`,
      ),
      code: [
        { label: 'SQL', lang: 'sql', code: ZERO_G3_SQL },
        { label: 'R', lang: 'r', code: rBetween('zero_g3 <-', '# Outliers in absences') },
      ],
      run: (db) => {
        const r = runQuery(db, ZERO_G3_SQL);
        return {
          before: L(`${r.values.length} students with G3 = 0`, `${r.values.length} طالبًا بعلامة G3 = 0`),
          after: L(`${A.n_rows} rows kept`, `أُبقي على ${A.n_rows} صفًا`),
          body: <div className="max-h-64 overflow-auto rounded-lg border border-line" dir="ltr"><SimpleTable head={r.columns} rows={r.values.map((v) => v.map(String))} numeric={[2, 3, 4, 5, 6, 7]} /></div>,
        };
      },
    },
    {
      n: 4,
      title: L('Outliers in absences (IQR rule)', 'القيم المتطرفة في الغياب (قاعدة المدى الربيعي)'),
      what: L('Flag absences above Q3 + 1.5 × IQR.', 'نحدد قيم الغياب الأكبر من Q3 + 1.5 × IQR.'),
      decision: L('Keep them.', 'نُبقيها.'),
      reason: L(
        `Q1 = ${A.absences_q1}, Q3 = ${A.absences_q3}, so the upper fence is ${A.absences_upper_fence}; ${A.absences_outliers} students lie above it. These are plausible counts (frequent absentees), not typing errors, and they are exactly the students an early-warning tool should see.`,
        `Q1 = ${A.absences_q1} وQ3 = ${A.absences_q3}، فالحد الأعلى ${A.absences_upper_fence}؛ ويقع ${A.absences_outliers} طالبًا فوقه. هذه أعداد معقولة (طلاب كثيرو الغياب) وليست أخطاء إدخال، وهم تحديدًا من يجب أن تراهم أداة الإنذار المبكر.`,
      ),
      code: [
        { label: 'R', lang: 'r', code: rBetween('# Outliers in absences', '# ====') },
        { label: 'SQL', lang: 'sql', code: OUTLIER_SQL.replace(':fence', String(A.absences_upper_fence)) },
        { label: 'TypeScript', lang: 'ts', code: `${extractFn(descSrc, 'quantile')}\n\n${extractFn(descSrc, 'boxStats')}` },
      ],
      run: (db) => {
        const r = runQuery(db, OUTLIER_SQL.replace(':fence', String(A.absences_upper_fence)));
        return {
          before: L(`${r.values[0][0]} outliers (> ${A.absences_upper_fence})`, `${r.values[0][0]} قيمة متطرفة (> ${A.absences_upper_fence})`),
          after: L(`${A.n_rows} rows kept`, `أُبقي على ${A.n_rows} صفًا`),
          body: (
            <ChartFrame
              title={L(`${A.absences_outliers} students miss more than ${A.absences_upper_fence} classes`, `${A.absences_outliers} طالبًا يتغيبون أكثر من ${A.absences_upper_fence} حصة`)}
              desc={L('Box plot of absences with outliers highlighted in coral.', 'مخطط صندوقي للغياب مع إبراز القيم المتطرفة باللون المرجاني.')}
              width={640}
              height={260}
            >
              <BoxPlotSvg groups={[{ label: L('All students', 'جميع الطلاب'), values: abs, color: 'var(--sky)' }]} xLabel="" yLabel={L('Absences (days)', 'الغياب (أيام)')} height={260} />
            </ChartFrame>
          ),
        };
      },
    },
    {
      n: 5,
      title: L('Type conversion to factors', 'التحويل إلى عوامل (factors)'),
      what: L(`Turn the ${FACTOR_CONVERTED.length} text columns into factors and three ordinal scales into ordered factors.`, `نحوّل الأعمدة النصية الـ ${FACTOR_CONVERTED.length} إلى عوامل، وثلاثة سلالم ترتيبية إلى عوامل مرتبة.`),
      decision: L('school, sex, address relabelled; 8 yes/no columns with levels no < yes; studytime_f, failures_f, Medu_f added as ordered factors.', 'أُعيدت تسمية school وsex وaddress؛ و8 أعمدة نعم/لا بمستويات no < yes؛ وأضيفت studytime_f وfailures_f وMedu_f كعوامل مرتبة.'),
      reason: L('R treats factors as groups in t.test(), aov(), chisq.test() and lm(); ordered factors keep the natural order in tables and charts, and failures 2 and 3 are merged into "2+" because they are rare.', 'يعامل R العوامل كمجموعات في t.test() وaov() وchisq.test() وlm()؛ وتحافظ العوامل المرتبة على الترتيب الطبيعي في الجداول والرسوم، ودُمجت قيمتا الرسوب 2 و3 في "2+" لندرتهما.'),
      code: [
        { label: 'SQL', lang: 'sql', code: FACTOR_SQL },
        { label: 'R', lang: 'r', code: rBetween('yes_no <-', '         pass ') },
        { label: 'TypeScript', lang: 'ts', code: extractFn(cleanSrc, 'cleanStudents') },
      ],
      run: (db) => {
        const before = columnCount(db, 'students_raw');
        db.exec(FACTOR_SQL);
        const after = columnCount(db, 'students_clean');
        const lv = (sql: string) => runQuery(db, sql).values.map((v) => `${v[0]} (${v[1]})`).join(' · ');
        return {
          before: L(`${before} columns`, `${before} عمودًا`),
          after: L(`${after} columns`, `${after} عمودًا`),
          body: (
            <SimpleTable
              head={[L('Factor', 'العامل'), L('Levels (n)', 'المستويات (العدد)')]}
              rows={[
                ['school', lv('SELECT school, COUNT(*) FROM students_clean GROUP BY school')],
                ['sex', lv('SELECT sex, COUNT(*) FROM students_clean GROUP BY sex')],
                ['studytime_f', STUDY_LABELS.map((l) => `${l} (${A.clean.filter((r) => r.studytime_f === l).length})`).join(' < ')],
                ['failures_f', FAIL_LABELS.map((l) => `${l} (${A.clean.filter((r) => r.failures_f === l).length})`).join(' < ')],
                ['Medu_f', MEDU_LABELS.map((l) => `${l} (${A.clean.filter((r) => r.Medu_f === l).length})`).join(' < ')],
              ]}
            />
          ),
        };
      },
    },
    {
      n: 6,
      title: L('Feature engineering', 'هندسة الخصائص'),
      what: L('Create pass, grade_band, alcohol = Dalc + Walc and avg_grade.', 'ننشئ pass وgrade_band وalcohol = Dalc + Walc وavg_grade.'),
      decision: L('Four new analysis columns.', 'أربعة أعمدة تحليل جديدة.'),
      reason: L('pass is the binary outcome for chi-square and logistic regression; grade bands follow the Portuguese scale; alcohol combines two related ordinal items; avg_grade summarises the year.', 'pass هو الناتج الثنائي لاختبار مربع كاي والانحدار اللوجستي؛ وفئات العلامات تتبع السلم البرتغالي؛ وalcohol يجمع بندين ترتيبيين مترابطين؛ وavg_grade يلخص أداء السنة.'),
      code: [
        { label: 'SQL', lang: 'sql', code: FEATURE_SQL },
        { label: 'R', lang: 'r', code: rBetween('         pass ', '         z_G3') },
        { label: 'TypeScript', lang: 'ts', code: extractFn(cleanSrc, 'gradeBand') },
      ],
      run: (db) => {
        const before = columnCount(db, 'students_clean');
        db.exec(FEATURE_SQL);
        const after = columnCount(db, 'students_clean');
        const bands = runQuery(db, 'SELECT grade_band, COUNT(*) FROM students_clean GROUP BY grade_band');
        const nOf = (b: string) => Number(bands.values.find((v) => v[0] === b)?.[1] ?? 0);
        return {
          before: L(`${before} columns`, `${before} عمودًا`),
          after: L(`${after} columns`, `${after} عمودًا`),
          body: (
            <ChartFrame
              title={L(`${nOf(BAND_LABELS[1])} students just pass (10–11): the largest band`, `${nOf(BAND_LABELS[1])} طالبًا ينجحون بالكاد (10–11): الفئة الأكبر`)}
              desc={L('Bar chart of students per grade band.', 'مخطط أعمدة لعدد الطلاب في كل فئة علامات.')}
              width={640}
              height={260}
            >
              <VBarSvg
                categories={BAND_LABELS.map((b) => b.split(' (')[0])}
                series={[{ name: 'n', color: 'var(--teal)', values: BAND_LABELS.map(nOf) }]}
                yLabel={L('Students', 'الطلاب')}
                height={260}
              />
            </ChartFrame>
          ),
        };
      },
    },
    {
      n: 7,
      title: L('Standardization (z-score)', 'التوحيد المعياري (z-score)'),
      what: L('z = (x − mean) / sd for G3 and absences.', 'z = (x − المتوسط) / الانحراف المعياري لكل من G3 والغياب.'),
      decision: L('Add z_G3 and z_absences.', 'إضافة z_G3 وz_absences.'),
      reason: L('Puts grades (0–20) and absences (0–32) on the same unit-free scale so they can be compared; the shape of each distribution does not change.', 'يضع العلامات (0–20) والغياب (0–32) على سلم واحد بلا وحدات لتسهيل المقارنة، دون تغيير شكل التوزيع.'),
      code: [
        { label: 'SQL', lang: 'sql', code: ZSCORE_SQL },
        { label: 'R', lang: 'r', code: 'z_G3       = as.numeric(scale(G3)),\nz_absences = as.numeric(scale(absences)),\n\ncat("z_G3 mean =", round(mean(students$z_G3), 4), " sd =", round(sd(students$z_G3), 4), "\\n")' },
        { label: 'TypeScript', lang: 'ts', code: extractFn(descSrc, 'zScores') },
      ],
      run: (db) => {
        const before = columnCount(db, 'students_clean');
        db.exec(ZSCORE_SQL);
        const after = columnCount(db, 'students_clean');
        const z = runQuery(db, 'SELECT z_G3 FROM students_clean').values.map((v) => Number(v[0]));
        return {
          before: L(`${before} columns`, `${before} عمودًا`),
          after: L(`${after} columns · mean ${fmt(mean(z), 4)} · sd ${fmt(sd(z), 4)}`, `${after} عمودًا · المتوسط ${fmt(mean(z), 4)} · الانحراف ${fmt(sd(z), 4)}`),
          body: (
            <div className="grid gap-4 sm:grid-cols-2">
              <ChartFrame title={L(`G3: mean ${fmt(mean(g3), 2)}, sd ${fmt(sdG3, 2)}`, `G3: المتوسط ${fmt(mean(g3), 2)}، الانحراف ${fmt(sdG3, 2)}`)} desc={L('Histogram of G3 before standardization.', 'مدرج تكراري لـ G3 قبل التوحيد.')} width={640} height={240}>
                <HistogramSvg values={g3} xLabel="G3" yLabel={L('Students', 'الطلاب')} height={240} domain={[0, 19]} />
              </ChartFrame>
              <ChartFrame title={L(`z_G3: mean ${fmt(mean(z), 2)}, sd ${fmt(sd(z), 2)}`, `z_G3: المتوسط ${fmt(mean(z), 2)}، الانحراف ${fmt(sd(z), 2)}`)} desc={L('Histogram of z_G3: same shape, centred at 0 with sd 1.', 'مدرج تكراري لـ z_G3: الشكل نفسه، متمركز عند 0 بانحراف 1.')} width={640} height={240}>
                <HistogramSvg values={z} binWidth={1 / sdG3} xLabel="z_G3" yLabel={L('Students', 'الطلاب')} height={240} color="var(--violet)" domain={[Math.min(...z) - 0.5 / sdG3, Math.max(...z) + 0.5 / sdG3]} />
              </ChartFrame>
            </div>
          ),
        };
      },
    },
    {
      n: 8,
      title: L('Min–max normalization', 'التطبيع بطريقة الحد الأدنى–الأعلى'),
      what: L('norm = (x − min) / (max − min) for absences.', 'norm = (x − الأدنى) / (الأعلى − الأدنى) للغياب.'),
      decision: L('Add norm_absences in [0, 1].', 'إضافة norm_absences ضمن [0، 1].'),
      reason: L('A bounded 0–1 version is handy for distance-based methods and for charts; unlike the z-score it keeps 0 meaning "never absent".', 'نسخة محصورة بين 0 و1 مفيدة للطرق المعتمدة على المسافة وللرسوم؛ وعلى خلاف z-score يبقى الصفر بمعنى "لم يتغيب أبدًا".'),
      code: [
        { label: 'SQL', lang: 'sql', code: MINMAX_SQL },
        { label: 'R', lang: 'r', code: 'norm_absences = (absences - min(absences)) / (max(absences) - min(absences))\n\ncat("norm_absences range =", range(students$norm_absences), "\\n")' },
        { label: 'TypeScript', lang: 'ts', code: extractFn(descSrc, 'minMax') },
      ],
      run: (db) => {
        const before = columnCount(db, 'students_clean');
        db.exec(MINMAX_SQL);
        const after = columnCount(db, 'students_clean');
        const r = runQuery(db, 'SELECT MIN(norm_absences), MAX(norm_absences) FROM students_clean').values[0];
        const vals = runQuery(db, 'SELECT norm_absences FROM students_clean').values.map((v) => Number(v[0]));
        const span = Math.max(...abs) - Math.min(...abs);
        return {
          before: L(`${before} columns`, `${before} عمودًا`),
          after: L(`${after} columns · range [${r[0]}, ${r[1]}]`, `${after} عمودًا · المدى [${r[0]}، ${r[1]}]`),
          body: (
            <ChartFrame title={L('Same right-skewed shape, now between 0 and 1', 'الشكل نفسه الملتوي لليمين، لكن الآن بين 0 و1')} desc={L('Histogram of normalized absences.', 'مدرج تكراري للغياب بعد التطبيع.')} width={640} height={240}>
              <HistogramSvg values={vals} binWidth={2 / span} domain={[0, 1 + 2 / span]} xLabel="norm_absences" yLabel={L('Students', 'الطلاب')} height={240} color="var(--sky)" />
            </ChartFrame>
          ),
        };
      },
    },
  ];

  const runUpTo = (n: number) => {
    if (!db) return;
    const next = { ...results };
    if (n < 5) next[n] = steps[n - 1].run(db);
    else {
      // steps 5-8 build students_clean in order, so running one replays the chain from step 5
      for (let k = 5; k <= 8; k++) delete next[k];
      for (let k = 5; k <= n; k++) next[k] = steps[k - 1].run(db);
    }
    setResults(next);
  };
  const runAll = () => {
    if (!db) return;
    const next: typeof results = {};
    for (const s of steps) next[s.n] = s.run(db);
    setResults(next);
  };
  // Open the page with every step already run, so the reader sees results at once.
  const autoRan = useRef(false);
  useEffect(() => {
    if (db && !autoRan.current) {
      autoRan.current = true;
      runAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);
  const done = Object.keys(results).length === 8;
  const cleanCols = done && db ? runQuery(db, 'SELECT * FROM students_clean LIMIT 1').columns : [];

  return (
    <div>
      <PageHeader
        step={2}
        eyebrow={L('Clean and preprocess', 'التنظيف والمعالجة المسبقة')}
        title={L('Eight checks before any statistics', 'ثماني خطوات قبل أي إحصاء')}
        lead={L(
          'Each step runs real SQL against the in-browser database, shows the counts before and after, the equivalent R code, and the decision we took with its reason.',
          'تشغّل كل خطوة استعلام SQL حقيقيًا على قاعدة البيانات داخل المتصفح، وتعرض الأعداد قبل وبعد، وكود R المكافئ، والقرار الذي اتخذناه مع سببه.',
        )}
      />
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={runAll} disabled={!db}>
          {db ? L('Re-run all 8 steps', 'إعادة تشغيل الخطوات الثماني') : L('Starting SQLite…', 'جارٍ تشغيل SQLite…')}
        </button>
        <span className="text-sm text-muted">{L(`${Object.keys(results).length} of 8 steps run`, `نُفذت ${Object.keys(results).length} من 8 خطوات`)}</span>
      </div>
      <div className="space-y-5">
        {steps.map((s) => (
          <div key={s.n}>
            <StepCard step={s} result={results[s.n]} onRun={() => runUpTo(s.n)} ready={!!db} />
            {s.n === 1 && results[1] && (
              <div className="mt-3 px-1">
                <Toggle label={L('Simulate 5% missing values (demonstration)', 'محاكاة 5% من القيم المفقودة (للتوضيح)')} checked={simulate} onChange={setSimulate} />
                {simulate && <MissingDemo L={L} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {done && (
        <Section title={L('Result: students_clean', 'النتيجة: students_clean')} lead={L(`${cleanCols.length} columns: the ${COLUMN_NAMES.length} originals plus ${ADDED_COLUMNS.length} new ones.`, `${cleanCols.length} عمودًا: الأعمدة الأصلية الـ ${COLUMN_NAMES.length} مضافًا إليها ${ADDED_COLUMNS.length} أعمدة جديدة.`)}>
          <div className="card">
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {cleanCols.map((c) => {
                const added = (ADDED_COLUMNS as readonly string[]).includes(c);
                const relabelled = ['school', 'sex', 'address'].includes(c);
                return (
                  <span key={c} className={`mono rounded px-2 py-0.5 text-xs ${added ? 'bg-tint font-semibold text-teal' : relabelled ? 'bg-soft text-amber' : 'bg-soft text-muted'}`}>
                    {added ? '+ ' : relabelled ? '~ ' : ''}{c}
                  </span>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <LegendItem color="var(--teal)" shape="square" label={L('+ added', '+ مضاف')} />
              <LegendItem color="var(--amber)" shape="square" label={L('~ relabelled', '~ أعيدت تسميته')} />
              <LegendItem color="var(--muted)" shape="square" label={L('unchanged', 'دون تغيير')} />
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <Interp>
              {L(
                'The data were already clean: no missing values and no duplicates. Our decisions were about meaning, not repair: keep zero grades and frequent absentees, give categories readable labels and order, and add the outcome and scaled variables that later tests and models need.',
                'كانت البيانات نظيفة أصلًا: لا قيم مفقودة ولا تكرار. لذلك كانت قراراتنا تتعلق بالمعنى لا بالإصلاح: الإبقاء على العلامات الصفرية والطلاب كثيري الغياب، وإعطاء الفئات أسماء وترتيبًا مفهومًا، وإضافة متغير الناتج والمتغيرات المعيارية التي تحتاجها الاختبارات والنماذج لاحقًا.',
              )}
            </Interp>
            <Caveat>
              {L('Standardizing changes the units, not the shape: z_G3 is still left-skewed by the zero grades, so tests that assume normality rely on the large sample (n = ' + A.n_rows + ').', 'التوحيد المعياري يغيّر الوحدات لا الشكل: ما زال z_G3 ملتويًا لليسار بسبب العلامات الصفرية، لذا تعتمد الاختبارات التي تفترض الطبيعية على كبر العينة (n = ' + A.n_rows + ').')}
            </Caveat>
          </div>
        </Section>
      )}
      <NextStep to="/describe" label={L('Describe', 'الوصف')} />
    </div>
  );
}
