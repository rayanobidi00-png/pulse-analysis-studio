import { useMemo, useState, type ReactNode } from 'react';
import { ChartFrame, LegendItem, PALETTE } from '../components/charts/ChartFrame';
import { BoxPlotSvg, HistogramSvg, ScatterSvg, VBarSvg } from '../components/charts/Charts';
import { Caveat, CodeTabs, Interp, NextStep, PageHeader, Select, SimpleTable, Slider, Stat, Verdict, type CodeTab } from '../components/ui';
import { levelsOf, numericOf, valuesOf } from '../analysis/levels';
import { BINARY, CATEGORICAL, COLUMNS } from '../content/columns';
import { useLang } from '../i18n/lang';
import { fmt, fmtP } from '../lib/format';
import { extractFn } from '../lib/source';
import { useAnalysis } from '../state/analysis';
import { anovaOneWay, groupBy, tukeyHSD } from '../stats/anova';
import { chiSqTest, crossTab } from '../stats/chisq';
import { corTest, spearman } from '../stats/correlation';
import { sd } from '../stats/descriptive';
import { tTestOne, tTestPaired, tTestWelch } from '../stats/ttest';
import ttestSrc from '../stats/ttest.ts?raw';
import chiSrc from '../stats/chisq.ts?raw';
import anovaSrc from '../stats/anova.ts?raw';
import corSrc from '../stats/correlation.ts?raw';

type Lfn = (en: string, ar: string) => string;

function d_label(d: number, L: Lfn) {
  const a = Math.abs(d);
  return a >= 0.8 ? L('large', 'كبير') : a >= 0.5 ? L('medium', 'متوسط') : a >= 0.2 ? L('small', 'صغير') : L('negligible', 'مهمل');
}

function TestCard({
  id, title, h0, h1, assumptions, stats, p, alpha, interp, code, chart, controls,
}: {
  id: string; title: string; h0: string; h1: string; assumptions: { ok: boolean; text: string }[]; stats: ReactNode; p: number;
  alpha: number; interp: string; code: CodeTab[]; chart: ReactNode; controls?: ReactNode;
}) {
  const { L } = useLang();
  const sig = p < alpha;
  return (
    <article id={id} className="card scroll-mt-20" aria-labelledby={`${id}-h`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id={`${id}-h`} className="text-xl font-bold">{title}</h2>
        <Verdict significant={sig}>
          {sig ? L(`Reject H0 at α = ${alpha.toFixed(2)}`, `نرفض H0 عند α = ${alpha.toFixed(2)}`) : L(`Do not reject H0 at α = ${alpha.toFixed(2)}`, `لا نرفض H0 عند α = ${alpha.toFixed(2)}`)}
        </Verdict>
      </div>
      {controls && <div className="no-print mt-4 grid gap-3 sm:grid-cols-3">{controls}</div>}
      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="rounded-lg bg-soft px-3 py-2"><b className="mono">H0</b> · {h0}</p>
            <p className="rounded-lg bg-soft px-3 py-2"><b className="mono">H1</b> · {h1}</p>
          </div>
          {stats}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{L('Assumptions', 'الافتراضات')}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {assumptions.map((a) => (
                <li key={a.text} className="flex gap-2">
                  <span aria-hidden className={a.ok ? 'text-teal' : 'text-amber'}>{a.ok ? '✓' : '!'}</span>
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <Interp>{interp}</Interp>
        </div>
        <div className="min-w-0 space-y-4">
          {chart}
          <CodeTabs tabs={code} />
        </div>
      </div>
    </article>
  );
}

function pText(p: number, alpha: number, L: Lfn) {
  return p < alpha
    ? L(`p = ${fmtP(p)} is below α = ${alpha.toFixed(2)}, so we reject H0`, `قيمة p = ${fmtP(p)} أصغر من α = ${alpha.toFixed(2)}، لذلك نرفض H0`)
    : L(`p = ${fmtP(p)} is not below α = ${alpha.toFixed(2)}, so we cannot reject H0`, `قيمة p = ${fmtP(p)} ليست أصغر من α = ${alpha.toFixed(2)}، لذلك لا نستطيع رفض H0`);
}

const NUM_COLS = ['G3', 'G2', 'G1', 'absences', 'age', 'failures', 'studytime', 'avg_grade', 'alcohol'];

export default function Test() {
  const A = useAnalysis();
  const { L } = useLang();
  const [alpha, setAlpha] = useState(0.05);
  const [mu0, setMu0] = useState(10);
  const [pair, setPair] = useState<'G3-G1' | 'G3-G2' | 'G2-G1'>('G3-G1');
  const [bin, setBin] = useState('sex');
  const [chiA, setChiA] = useState('higher');
  const [chiB, setChiB] = useState('pass');
  const [factor, setFactor] = useState('studytime_f');
  const [cx, setCx] = useState('studytime');
  const [cy, setCy] = useState('G3');

  const g3 = A.raw.map((r) => r.G3);
  const one = tTestOne(g3, mu0);
  const [pa, pb] = pair.split('-') as ('G1' | 'G2' | 'G3')[];
  const paired = tTestPaired(A.raw.map((r) => r[pa]), A.raw.map((r) => r[pb]));
  const diffs = A.raw.map((r) => r[pa] - r[pb]);

  const binLevels = levelsOf(A.clean, bin);
  const binVals = valuesOf(A.clean, bin);
  const gA = A.clean.filter((_, i) => binVals[i] === binLevels[0]).map((r) => r.G3);
  const gB = A.clean.filter((_, i) => binVals[i] === binLevels[1]).map((r) => r.G3);
  const welch = tTestWelch(gA, gB);

  const chiTab = crossTab(valuesOf(A.clean, chiA), valuesOf(A.clean, chiB), levelsOf(A.clean, chiA), levelsOf(A.clean, chiB));
  const chi = chiSqTest(chiTab.observed, chiTab.rowLevels, chiTab.colLevels);

  const fLevels = levelsOf(A.clean, factor);
  const aov = anovaOneWay(groupBy(g3, valuesOf(A.clean, factor), fLevels));
  const tukey = tukeyHSD(aov);
  const groupSds = groupBy(g3, valuesOf(A.clean, factor), fLevels).map((g) => sd(g.values));
  const sdRatio = Math.max(...groupSds) / Math.min(...groupSds);

  const factorOptions = useMemo(() => [...CATEGORICAL, 'studytime_f', 'failures_f', 'Medu_f', 'grade_band'].filter((c) => levelsOf(A.clean, c).length >= 3), [A.clean]);
  const catOptions = [...CATEGORICAL, 'pass', 'studytime_f', 'failures_f', 'Medu_f'];

  // Test chooser
  const kindOf = (c: string): 'numeric' | 'ordinal' | 'binary' | 'nominal' => {
    if (NUM_COLS.includes(c) && !COLUMNS.find((k) => k.name === c && k.kind === 'ordinal')) return 'numeric';
    const info = COLUMNS.find((k) => k.name === c);
    if (info?.kind === 'ordinal') return 'ordinal';
    return levelsOf(A.clean, c).length === 2 ? 'binary' : 'nominal';
  };
  const kindName = (c: string) => {
    const k = kindOf(c);
    return k === 'numeric' ? L('numeric', 'رقمي') : k === 'ordinal' ? L('ordinal', 'ترتيبي') : k === 'binary' ? L('binary', 'ثنائي') : L('nominal', 'اسمي');
  };
  const chooserOptions = [...new Set([...NUM_COLS, ...COLUMNS.map((c) => c.name), 'pass', 'studytime_f', 'failures_f', 'Medu_f'])];

  const chooser = (() => {
    const kx = kindOf(cx);
    const ky = kindOf(cy);
    const isNum = (k: string) => k === 'numeric' || k === 'ordinal';
    if (cx === cy) return { test: L('Pick two different variables', 'اختر متغيرين مختلفين'), why: '', result: null as ReactNode, p: NaN };
    if (isNum(kx) && isNum(ky)) {
      const xs = numericOf(A.clean, cx);
      const ys = numericOf(A.clean, cy);
      const ct = corTest(xs, ys);
      const ordinal = kx === 'ordinal' || ky === 'ordinal';
      return {
        test: ordinal ? L('Spearman rank correlation (+ Pearson cor.test)', 'ارتباط سبيرمان للرتب (+ اختبار بيرسون)') : L('Pearson correlation test, cor.test()', 'اختبار ارتباط بيرسون، cor.test()'),
        why: ordinal
          ? L('Both variables are ordered numbers, and at least one is an ordinal scale, so a rank-based correlation is the safer summary.', 'كلا المتغيرين أرقام مرتبة، وأحدهما على الأقل سلم ترتيبي، لذا فالارتباط المعتمد على الرتب أكثر أمانًا.')
          : L('Both variables are numeric, so we measure their linear association.', 'كلا المتغيرين رقميان، لذا نقيس العلاقة الخطية بينهما.'),
        p: ct.p,
        result: (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="r" value={fmt(ct.r, 4)} /><Stat label="ρ" value={fmt(spearman(xs, ys), 4)} /><Stat label={`t (df ${ct.df})`} value={fmt(ct.t, 3)} /><Stat label="p" value={fmtP(ct.p)} />
          </div>
        ),
      };
    }
    if (isNum(kx) !== isNum(ky)) {
      const numCol = isNum(kx) ? cx : cy;
      const catCol = isNum(kx) ? cy : cx;
      const lv = levelsOf(A.clean, catCol);
      const ys = numericOf(A.clean, numCol);
      const cv = valuesOf(A.clean, catCol);
      if (lv.length === 2) {
        const t = tTestWelch(ys.filter((_, i) => cv[i] === lv[0]), ys.filter((_, i) => cv[i] === lv[1]));
        return {
          test: L('Welch two-sample t-test', 'اختبار t لعينتين (ويلش)'),
          why: L(`${numCol} is numeric and ${catCol} splits students into two groups, so we compare two means without assuming equal variances.`, `${numCol} رقمي و${catCol} يقسم الطلاب إلى مجموعتين، لذا نقارن متوسطين دون افتراض تساوي التباين.`),
          p: t.p,
          result: <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label={L(`mean ${lv[0]}`, `متوسط ${lv[0]}`)} value={fmt((t.estimate as number[])[0], 3)} /><Stat label={L(`mean ${lv[1]}`, `متوسط ${lv[1]}`)} value={fmt((t.estimate as number[])[1], 3)} /><Stat label={`t (df ${fmt(t.df, 1)})`} value={fmt(t.statistic, 3)} /><Stat label="p" value={fmtP(t.p)} /></div>,
        };
      }
      const a = anovaOneWay(groupBy(ys, cv, lv));
      return {
        test: L('One-way ANOVA', 'تحليل التباين الأحادي'),
        why: L(`${numCol} is numeric and ${catCol} has ${lv.length} groups, so we compare several means at once (and follow up with Tukey HSD).`, `${numCol} رقمي و${catCol} فيه ${lv.length} مجموعات، لذا نقارن عدة متوسطات معًا (ثم نتبع ذلك باختبار توكي).`),
        p: a.p,
        result: <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label={`F (${a.df1}, ${a.df2})`} value={fmt(a.F, 3)} /><Stat label="η²" value={fmt(a.eta2, 3)} /><Stat label={L('groups', 'المجموعات')} value={String(lv.length)} /><Stat label="p" value={fmtP(a.p)} /></div>,
      };
    }
    const t = crossTab(valuesOf(A.clean, cx), valuesOf(A.clean, cy), levelsOf(A.clean, cx), levelsOf(A.clean, cy));
    const c = chiSqTest(t.observed);
    return {
      test: L('Chi-square test of independence', 'اختبار مربع كاي للاستقلال'),
      why: L('Both variables are categorical, so we test whether the distribution of one depends on the other.', 'كلا المتغيرين فئويان، لذا نختبر ما إذا كان توزيع أحدهما يعتمد على الآخر.'),
      p: c.p,
      result: <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label={`χ² (df ${c.df})`} value={fmt(c.statistic, 3)} /><Stat label="Cramér V" value={fmt(c.cramerV, 3)} /><Stat label={L('min expected', 'أدنى متوقع')} value={fmt(c.minExpected, 2)} /><Stat label="p" value={fmtP(c.p)} /></div>,
    };
  })();

  const nav = [
    ['t-one', L('One-sample t', 't لعينة واحدة')], ['t-paired', L('Paired t', 't للأزواج')], ['t-welch', L('Welch t', 't لويلش')],
    ['chi', L('Chi-square', 'مربع كاي')], ['anova', 'ANOVA'], ['chooser', L('Test chooser', 'مساعد الاختيار')],
  ];
  const pairLabel = `${pa} − ${pb}`;
  const sigWord = (p: number) => (p < alpha ? L('significant', 'دالّ إحصائيًا') : L('not significant', 'غير دالّ إحصائيًا'));

  return (
    <div>
      <PageHeader
        step={4}
        eyebrow={L('Inferential statistics', 'الإحصاء الاستدلالي')}
        title={L('The test lab', 'مختبر الاختبارات')}
        lead={L(
          'Every test states its hypotheses, checks its assumptions, and reports the statistic, degrees of freedom, p-value, confidence interval and effect size. Move α and every decision updates; change the variables and every test reruns.',
          'يحدد كل اختبار فرضياته، ويتحقق من افتراضاته، ويعرض الإحصاءة ودرجات الحرية وقيمة p وفترة الثقة وحجم الأثر. حرّك α فتتحدث كل القرارات؛ وغيّر المتغيرات فيُعاد تشغيل كل اختبار.',
        )}
      />
      <div className="no-print sticky top-14 z-10 -mx-4 mb-6 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="w-56"><Slider label={L('Significance level α', 'مستوى الدلالة α')} value={alpha} min={0.01} max={0.1} step={0.01} onChange={setAlpha} format={(v) => v.toFixed(2)} /></div>
          <nav aria-label={L('Tests', 'الاختبارات')} className="flex flex-wrap gap-1.5">
            {nav.map(([id, label]) => <a key={id} href={`#/test`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }} className="chip hover:text-ink">{label}</a>)}
          </nav>
        </div>
      </div>

      <div className="space-y-6">
        <TestCard
          id="t-one"
          title={L('One-sample t-test: is the mean final grade different from μ0?', 'اختبار t لعينة واحدة: هل يختلف متوسط العلامة النهائية عن μ0؟')}
          h0={`μ(G3) = ${mu0}`}
          h1={`μ(G3) ≠ ${mu0}`}
          alpha={alpha}
          p={one.p}
          controls={<Slider label={L('μ0 (hypothesised mean)', 'μ0 (المتوسط المفترض)')} value={mu0} min={8} max={14} step={0.5} onChange={setMu0} format={(v) => v.toFixed(1)} />}
          assumptions={[
            { ok: true, text: L('Independent observations: one row per student.', 'مشاهدات مستقلة: صف واحد لكل طالب.') },
            { ok: true, text: L(`n = ${g3.length} is large, so the sampling distribution of the mean is close to normal (CLT) even though G3 is left-skewed by the zero grades.`, `n = ${g3.length} كبيرة، لذا يقترب توزيع المعاينة للمتوسط من الطبيعي (نظرية النهاية المركزية) رغم التواء G3 لليسار بسبب العلامات الصفرية.`) },
          ]}
          stats={<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="t" value={fmt(one.statistic, 3)} /><Stat label="df" value={String(one.df)} /><Stat label="p" value={fmtP(one.p)} />
            <Stat label={L('mean', 'المتوسط')} value={fmt(one.estimate as number, 3)} /><Stat label="95% CI" value={`[${fmt(one.ci[0], 2)}, ${fmt(one.ci[1], 2)}]`} /><Stat label="Cohen d" value={fmt(one.d, 2)} sub={d_label(one.d, L)} />
          </div>}
          interp={L(
            `The mean final grade is ${fmt(one.estimate as number, 2)} (95% CI ${fmt(one.ci[0], 2)}–${fmt(one.ci[1], 2)}). ${pText(one.p, alpha, L)}: the average student ${one.p < alpha ? (one.statistic > 0 ? 'scores above' : 'scores below') : 'is not clearly different from'} ${mu0}. The effect size (d = ${fmt(one.d, 2)}) is ${d_label(one.d, L)}.`,
            `متوسط العلامة النهائية ${fmt(one.estimate as number, 2)} (فترة الثقة 95%: ${fmt(one.ci[0], 2)}–${fmt(one.ci[1], 2)}). ${pText(one.p, alpha, L)}: ${one.p < alpha ? (one.statistic > 0 ? 'يحصل الطالب المتوسط على أعلى من' : 'يحصل الطالب المتوسط على أقل من') : 'لا يختلف الطالب المتوسط بوضوح عن'} ${mu0}. حجم الأثر (d = ${fmt(one.d, 2)}) ${d_label(one.d, L)}.`,
          )}
          code={[{ label: 'R', lang: 'r', code: `t_one <- t.test(df$G3, mu = ${mu0})\nprint(t_one)` }, { label: 'TypeScript', lang: 'ts', code: extractFn(ttestSrc, 'tTestOne') }]}
          chart={<ChartFrame title={L(`Sample mean ${fmt(one.estimate as number, 2)} vs μ0 = ${mu0}`, `متوسط العينة ${fmt(one.estimate as number, 2)} مقابل μ0 = ${mu0}`)} desc={L('Histogram of G3 with the hypothesised and sample means.', 'مدرج تكراري لـ G3 مع المتوسط المفترض ومتوسط العينة.')} width={640} height={240}>
            <HistogramSvg values={g3} domain={[0, 19]} xLabel={L('Final grade G3', 'العلامة النهائية G3')} yLabel={L('Students', 'الطلاب')} height={240} color="var(--sky)" markers={[{ x: mu0, label: `μ0 = ${mu0}`, color: 'var(--coral)', dashed: true }, { x: one.estimate as number, label: `x̄`, color: 'var(--ink)' }]} />
          </ChartFrame>}
        />

        <TestCard
          id="t-paired"
          title={L(`Paired t-test: did grades change (${pairLabel})?`, `اختبار t للأزواج: هل تغيرت العلامات (${pairLabel})؟`)}
          h0={L(`mean difference ${pairLabel} = 0`, `متوسط الفرق ${pairLabel} = 0`)}
          h1={L(`mean difference ≠ 0`, `متوسط الفرق ≠ 0`)}
          alpha={alpha}
          p={paired.p}
          controls={<Select label={L('Pair', 'الزوج')} value={pair} onChange={setPair} options={[{ value: 'G3-G1', label: 'G3 − G1' }, { value: 'G3-G2', label: 'G3 − G2' }, { value: 'G2-G1', label: 'G2 − G1' }]} />}
          assumptions={[
            { ok: true, text: L('Both grades belong to the same student, so the samples are paired.', 'العلامتان للطالب نفسه، لذا العينتان مزدوجتان.') },
            { ok: true, text: L(`n = ${diffs.length} differences: large enough for the CLT.`, `n = ${diffs.length} فرقًا: عدد كافٍ لتطبيق نظرية النهاية المركزية.`) },
          ]}
          stats={<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="t" value={fmt(paired.statistic, 3)} /><Stat label="df" value={String(paired.df)} /><Stat label="p" value={fmtP(paired.p)} />
            <Stat label={L('mean difference', 'متوسط الفرق')} value={fmt(paired.estimate as number, 4)} /><Stat label="95% CI" value={`[${fmt(paired.ci[0], 3)}, ${fmt(paired.ci[1], 3)}]`} /><Stat label="d" value={fmt(paired.d, 2)} sub={d_label(paired.d, L)} />
          </div>}
          interp={L(
            `On average ${pa} is ${fmt(Math.abs(paired.estimate as number), 2)} points ${(paired.estimate as number) >= 0 ? 'higher' : 'lower'} than ${pb}. ${pText(paired.p, alpha, L)}. The change is ${sigWord(paired.p)} but ${d_label(paired.d, L)} in size (d = ${fmt(paired.d, 2)}): statistically real, practically modest.`,
            `في المتوسط، ${pa} ${(paired.estimate as number) >= 0 ? 'أعلى' : 'أقل'} من ${pb} بمقدار ${fmt(Math.abs(paired.estimate as number), 2)} نقطة. ${pText(paired.p, alpha, L)}. التغير ${sigWord(paired.p)} لكن حجمه ${d_label(paired.d, L)} (d = ${fmt(paired.d, 2)}): حقيقي إحصائيًا ومتواضع عمليًا.`,
          )}
          code={[{ label: 'R', lang: 'r', code: `t_paired <- t.test(df$${pa}, df$${pb}, paired = TRUE)\nprint(t_paired)` }, { label: 'TypeScript', lang: 'ts', code: extractFn(ttestSrc, 'tTestPaired') }]}
          chart={<ChartFrame title={L(`${fmt((100 * diffs.filter((d) => Math.abs(d) <= 1).length) / diffs.length, 0)}% of students change by at most 1 point (${pairLabel})`, `${fmt((100 * diffs.filter((d) => Math.abs(d) <= 1).length) / diffs.length, 0)}% من الطلاب تتغير علامتهم بنقطة واحدة على الأكثر (${pairLabel})`)} desc={L('Histogram of the paired differences.', 'مدرج تكراري للفروق المزدوجة.')} width={640} height={240}>
            <HistogramSvg values={diffs} xLabel={pairLabel} yLabel={L('Students', 'الطلاب')} height={240} color="var(--violet)" markers={[{ x: 0, label: '0', color: 'var(--coral)', dashed: true }]} />
          </ChartFrame>}
        />

        <TestCard
          id="t-welch"
          title={L(`Welch two-sample t-test: G3 by ${bin}`, `اختبار t لعينتين (ويلش): G3 حسب ${bin}`)}
          h0={`μ(${binLevels[0]}) = μ(${binLevels[1]})`}
          h1={`μ(${binLevels[0]}) ≠ μ(${binLevels[1]})`}
          alpha={alpha}
          p={welch.p}
          controls={<Select label={L('Binary column', 'عمود ثنائي')} value={bin} onChange={setBin} options={BINARY.map((b) => ({ value: b, label: b }))} />}
          assumptions={[
            { ok: true, text: L('Two independent groups of different students.', 'مجموعتان مستقلتان من طلاب مختلفين.') },
            { ok: Math.min(gA.length, gB.length) >= 30, text: L(`Group sizes ${gA.length} and ${gB.length}${Math.min(gA.length, gB.length) < 30 ? ': the smaller group is under 30, so read the p-value with care' : ': both large'}.`, `حجما المجموعتين ${gA.length} و${gB.length}${Math.min(gA.length, gB.length) < 30 ? ': المجموعة الأصغر أقل من 30، لذا تُقرأ قيمة p بحذر' : ': كلاهما كبير'}.`) },
            { ok: true, text: L(`Variances need not be equal (SD ${fmt(sd(gA), 2)} vs ${fmt(sd(gB), 2)}): Welch adjusts the df to ${fmt(welch.df, 1)}.`, `لا يلزم تساوي التباين (الانحراف ${fmt(sd(gA), 2)} مقابل ${fmt(sd(gB), 2)}): يعدّل ويلش درجات الحرية إلى ${fmt(welch.df, 1)}.`) },
          ]}
          stats={<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="t" value={fmt(welch.statistic, 3)} /><Stat label="df" value={fmt(welch.df, 2)} /><Stat label="p" value={fmtP(welch.p)} />
            <Stat label={L(`mean ${binLevels[0]}`, `متوسط ${binLevels[0]}`)} value={fmt((welch.estimate as number[])[0], 3)} /><Stat label={L(`mean ${binLevels[1]}`, `متوسط ${binLevels[1]}`)} value={fmt((welch.estimate as number[])[1], 3)} /><Stat label="95% CI" value={`[${fmt(welch.ci[0], 2)}, ${fmt(welch.ci[1], 2)}]`} sub={L('difference', 'الفرق')} />
          </div>}
          interp={L(
            `Students with ${bin} = ${binLevels[0]} average ${fmt((welch.estimate as number[])[0], 2)} and those with ${binLevels[1]} average ${fmt((welch.estimate as number[])[1], 2)}. ${pText(welch.p, alpha, L)}; the difference is ${sigWord(welch.p)}, with a ${d_label(welch.d, L)} effect (d = ${fmt(welch.d, 2)}).`,
            `متوسط الطلاب الذين ${bin} = ${binLevels[0]} هو ${fmt((welch.estimate as number[])[0], 2)}، ومتوسط ${binLevels[1]} هو ${fmt((welch.estimate as number[])[1], 2)}. ${pText(welch.p, alpha, L)}؛ والفرق ${sigWord(welch.p)}، بحجم أثر ${d_label(welch.d, L)} (d = ${fmt(welch.d, 2)}).`,
          )}
          code={[{ label: 'R', lang: 'r', code: `t.test(G3 ~ ${bin}, data = students)   # Welch is R's default` }, { label: 'TypeScript', lang: 'ts', code: extractFn(ttestSrc, 'tTestWelch') }]}
          chart={<ChartFrame title={L(`G3 by ${bin}: a gap of ${fmt(Math.abs((welch.estimate as number[])[0] - (welch.estimate as number[])[1]), 2)} points`, `G3 حسب ${bin}: فرق قدره ${fmt(Math.abs((welch.estimate as number[])[0] - (welch.estimate as number[])[1]), 2)} نقطة`)} desc={L('Box plots of G3 for the two groups; diamond is the mean.', 'مخططات صندوقية لـ G3 للمجموعتين؛ المعيّن يمثل المتوسط.')} width={640} height={260}>
            <BoxPlotSvg groups={[{ label: binLevels[0], values: gA, color: 'var(--sky)' }, { label: binLevels[1], values: gB, color: 'var(--teal)' }]} xLabel={bin} yLabel="G3" height={260} yDomain={[0, 20]} />
          </ChartFrame>}
        />

        <TestCard
          id="chi"
          title={L(`Chi-square test of independence: ${chiA} × ${chiB}`, `اختبار مربع كاي للاستقلال: ${chiA} × ${chiB}`)}
          h0={L(`${chiA} and ${chiB} are independent`, `${chiA} و${chiB} مستقلان`)}
          h1={L(`${chiA} and ${chiB} are associated`, `${chiA} و${chiB} مرتبطان`)}
          alpha={alpha}
          p={chi.p}
          controls={<>
            <Select label={L('Rows', 'الصفوف')} value={chiA} onChange={setChiA} options={catOptions.filter((c) => c !== chiB).map((c) => ({ value: c, label: c }))} />
            <Select label={L('Columns', 'الأعمدة')} value={chiB} onChange={setChiB} options={catOptions.filter((c) => c !== chiA).map((c) => ({ value: c, label: c }))} />
          </>}
          assumptions={[
            { ok: true, text: L('Each student is counted once (independent observations).', 'يُعدّ كل طالب مرة واحدة (مشاهدات مستقلة).') },
            { ok: chi.minExpected >= 5, text: L(`Minimum expected count = ${fmt(chi.minExpected, 2)} ${chi.minExpected >= 5 ? '(≥ 5, fine)' : '(< 5: the χ² approximation is unreliable; merge levels or use fisher.test())'}.`, `أدنى تكرار متوقع = ${fmt(chi.minExpected, 2)} ${chi.minExpected >= 5 ? '(≥ 5، مقبول)' : '(< 5: تقريب مربع كاي غير موثوق؛ ادمج المستويات أو استخدم fisher.test())'}.`) },
            { ok: true, text: L('No continuity correction (correct = FALSE), as in our R script.', 'دون تصحيح الاستمرارية (correct = FALSE) كما في سكربت R.') },
          ]}
          stats={<>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="χ²" value={fmt(chi.statistic, 3)} /><Stat label="df" value={String(chi.df)} /><Stat label="p" value={fmtP(chi.p)} /><Stat label="Cramér V" value={fmt(chi.cramerV, 3)} />
            </div>
            <div className="overflow-x-auto">
              <table className="tbl mono num text-xs" dir="ltr">
                <thead><tr><th>{chiA} \ {chiB}</th>{chi.colLevels.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{chi.observed.map((r, i) => <tr key={i}><td className="font-semibold">{chi.rowLevels[i]}</td>{r.map((o, j) => <td key={j}>{o} <span className="text-muted">({fmt(chi.expected[i][j], 1)})</span></td>)}</tr>)}</tbody>
              </table>
              <p className="mt-1 text-xs text-muted">{L('observed (expected)', 'المشاهد (المتوقع)')}</p>
            </div>
          </>}
          interp={L(
            `${pText(chi.p, alpha, L)}: ${chi.p < alpha ? `${chiB} depends on ${chiA}` : `we have no evidence that ${chiB} depends on ${chiA}`}. Cramér’s V = ${fmt(chi.cramerV, 2)} measures how strong the association is (0 = none, 1 = perfect).`,
            `${pText(chi.p, alpha, L)}: ${chi.p < alpha ? `${chiB} يعتمد على ${chiA}` : `لا دليل على أن ${chiB} يعتمد على ${chiA}`}. يقيس معامل كرامر V = ${fmt(chi.cramerV, 2)} قوة الارتباط (0 = لا ارتباط، 1 = تام).`,
          )}
          code={[{ label: 'R', lang: 'r', code: `tab <- table(students$${chiA}, students$${chiB})\nchisq.test(tab, correct = FALSE)\nchisq.test(tab, correct = FALSE)$expected` }, { label: 'TypeScript', lang: 'ts', code: extractFn(chiSrc, 'chiSqTest') }]}
          chart={<ChartFrame
            title={L(`Distribution of ${chiB} within each level of ${chiA}`, `توزيع ${chiB} داخل كل مستوى من ${chiA}`)}
            desc={L('Grouped bars of row percentages.', 'أعمدة مجمّعة لنسب الصفوف.')}
            width={640} height={260}
            legend={chi.colLevels.map((c, i) => <LegendItem key={c} color={c === 'Fail' ? 'var(--coral)' : c === 'Pass' ? 'var(--teal)' : PALETTE[i % PALETTE.length]} label={c} />)}
          >
            <VBarSvg categories={chi.rowLevels} series={chi.colLevels.map((c, j) => ({ name: c, color: c === 'Fail' ? 'var(--coral)' : c === 'Pass' ? 'var(--teal)' : PALETTE[j % PALETTE.length], values: chi.observed.map((r) => (100 * r[j]) / r.reduce((a, b) => a + b, 0)) }))} yLabel={L('% of row', '% من الصف')} height={260} valueFormat={(v) => fmt(v, 0)} yDomain={[0, 100]} />
          </ChartFrame>}
        />

        <TestCard
          id="anova"
          title={L(`One-way ANOVA + Tukey HSD: G3 by ${factor}`, `تحليل التباين الأحادي + توكي: G3 حسب ${factor}`)}
          h0={L('all group means are equal', 'جميع متوسطات المجموعات متساوية')}
          h1={L('at least one group mean differs', 'متوسط مجموعة واحدة على الأقل مختلف')}
          alpha={alpha}
          p={aov.p}
          controls={<Select label={L('Factor', 'العامل')} value={factor} onChange={setFactor} options={factorOptions.map((c) => ({ value: c, label: c }))} />}
          assumptions={[
            { ok: true, text: L('Independent groups of different students.', 'مجموعات مستقلة من طلاب مختلفين.') },
            { ok: sdRatio < 2, text: L(`Largest / smallest group SD = ${fmt(sdRatio, 2)} ${sdRatio < 2 ? '(< 2: equal-variance assumption is reasonable)' : '(≥ 2: variances differ; consider oneway.test())'}.`, `نسبة أكبر انحراف معياري إلى أصغره = ${fmt(sdRatio, 2)} ${sdRatio < 2 ? '(< 2: افتراض تساوي التباين معقول)' : '(≥ 2: التباينات مختلفة؛ يمكن استخدام oneway.test())'}.`) },
            { ok: Math.min(...aov.groups.map((g) => g.n)) >= 10, text: L(`Smallest group n = ${Math.min(...aov.groups.map((g) => g.n))}.`, `أصغر مجموعة n = ${Math.min(...aov.groups.map((g) => g.n))}.`) },
          ]}
          stats={<>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="F" value={fmt(aov.F, 3)} /><Stat label="df" value={`${aov.df1}, ${aov.df2}`} /><Stat label="p" value={fmtP(aov.p)} /><Stat label="η²" value={fmt(aov.eta2, 3)} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tukey HSD (95%)</p>
              <SimpleTable head={[L('pair', 'الزوج'), 'diff', 'lwr', 'upr', 'p adj']} rows={tukey.map((t) => [t.pair, fmt(t.diff, 3), fmt(t.lwr, 3), fmt(t.upr, 3), `${fmtP(t.padj)}${t.padj < alpha ? ' *' : ''}`])} numeric={[0, 1, 2, 3, 4]} />
            </div>
          </>}
          interp={L(
            `${pText(aov.p, alpha, L)}. ${factor} explains ${fmt(aov.eta2 * 100, 1)}% of the variance in G3 (η²). Tukey HSD finds ${tukey.filter((t) => t.padj < alpha).length} of ${tukey.length} pairs significantly different at α = ${alpha.toFixed(2)}; pairs whose interval crosses 0 are not.`,
            `${pText(aov.p, alpha, L)}. يفسّر ${factor} نسبة ${fmt(aov.eta2 * 100, 1)}% من تباين G3 (η²). ويجد اختبار توكي ${tukey.filter((t) => t.padj < alpha).length} من أصل ${tukey.length} أزواج مختلفة بدلالة عند α = ${alpha.toFixed(2)}؛ أما الأزواج التي تتضمن فترتها الصفر فليست كذلك.`,
          )}
          code={[{ label: 'R', lang: 'r', code: `a <- aov(G3 ~ ${factor}, data = students)\nsummary(a)\nTukeyHSD(a)` }, { label: 'TypeScript', lang: 'ts', code: `${extractFn(anovaSrc, 'anovaOneWay')}\n\n${extractFn(anovaSrc, 'tukeyHSD')}` }]}
          chart={<ChartFrame title={L(`Mean G3 ranges from ${fmt(Math.min(...aov.groups.map((g) => g.mean)), 2)} to ${fmt(Math.max(...aov.groups.map((g) => g.mean)), 2)} across ${factor}`, `يتراوح متوسط G3 بين ${fmt(Math.min(...aov.groups.map((g) => g.mean)), 2)} و${fmt(Math.max(...aov.groups.map((g) => g.mean)), 2)} عبر ${factor}`)} desc={L('Box plots of G3 per group.', 'مخططات صندوقية لـ G3 لكل مجموعة.')} width={640} height={280}>
            <BoxPlotSvg groups={aov.groups.map((g, i) => ({ label: g.level, values: groupBy(g3, valuesOf(A.clean, factor), [g.level])[0].values, color: PALETTE[i % PALETTE.length] }))} xLabel={factor} yLabel="G3" height={280} yDomain={[0, 20]} />
          </ChartFrame>}
        />

        <article id="chooser" className="card scroll-mt-20">
          <h2 className="text-xl font-bold">{L('Test chooser: which test fits my two variables?', 'مساعد اختيار الاختبار: أي اختبار يناسب متغيريّ؟')}</h2>
          <div className="no-print mt-4 grid gap-3 sm:grid-cols-3">
            <Select label={L('Variable 1', 'المتغير 1')} value={cx} onChange={setCx} options={chooserOptions.map((c) => ({ value: c, label: `${c} · ${kindName(c)}` }))} />
            <Select label={L('Variable 2', 'المتغير 2')} value={cy} onChange={setCy} options={chooserOptions.map((c) => ({ value: c, label: `${c} · ${kindName(c)}` }))} />
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-lg font-bold text-teal">{chooser.test}</p>
              <p className="text-sm text-muted">{chooser.why}</p>
              {chooser.result}
              {Number.isFinite(chooser.p) && <Verdict significant={chooser.p < alpha}>{sigWord(chooser.p)} (α = {alpha.toFixed(2)})</Verdict>}
            </div>
            <div className="rounded-lg bg-soft p-4 text-sm">
              <p className="font-semibold">{L('Decision rules', 'قواعد الاختيار')}</p>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-muted">
                <li>{L('numeric × numeric → Pearson cor.test (Spearman if ordinal)', 'رقمي × رقمي ← اختبار ارتباط بيرسون (سبيرمان إن كان ترتيبيًا)')}</li>
                <li>{L('numeric × 2 groups → Welch t-test', 'رقمي × مجموعتان ← اختبار t لويلش')}</li>
                <li>{L('numeric × 3+ groups → one-way ANOVA + Tukey', 'رقمي × 3 مجموعات فأكثر ← ANOVA أحادي + توكي')}</li>
                <li>{L('categorical × categorical → chi-square', 'فئوي × فئوي ← مربع كاي')}</li>
              </ul>
            </div>
          </div>
          {kindOf(cx) !== 'nominal' && kindOf(cx) !== 'binary' && kindOf(cy) !== 'nominal' && kindOf(cy) !== 'binary' && cx !== cy && (
            <div className="mt-5 max-w-2xl">
              <ChartFrame title={L(`${cy} against ${cx}`, `${cy} مقابل ${cx}`)} desc={L('Scatter plot of the two chosen variables.', 'مخطط انتشار للمتغيرين المختارين.')} width={640} height={280}>
                <ScatterSvg points={numericOf(A.clean, cx).map((x, i) => ({ x, y: numericOf(A.clean, cy)[i] }))} xLabel={cx} yLabel={cy} height={280} />
              </ChartFrame>
            </div>
          )}
          <div className="mt-5"><CodeTabs tabs={[{ label: 'TypeScript', lang: 'ts', code: extractFn(corSrc, 'spearman') }]} /></div>
        </article>

        <Caveat>
          {L(
            `We ran many tests on the same data. At α = ${alpha.toFixed(2)}, about ${Math.round(alpha * 100)} in 100 true-null tests would look significant by chance, so weak p-values near α deserve caution. Tests show association, not cause: these students were observed, not assigned.`,
            `أجرينا اختبارات كثيرة على البيانات نفسها. عند α = ${alpha.toFixed(2)}، سيبدو نحو ${Math.round(alpha * 100)} من كل 100 اختبار صحيح الفرضية الصفرية دالًا بالمصادفة، لذا تستحق قيم p القريبة من α الحذر. الاختبارات تُظهر ارتباطًا لا سببية: هؤلاء الطلاب رُصدوا ولم يُوزَّعوا تجريبيًا.`,
          )}
        </Caveat>
      </div>
      <NextStep to="/model" label={L('Model', 'النمذجة')} />
    </div>
  );
}
