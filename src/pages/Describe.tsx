import { useMemo, useState } from 'react';
import { ChartFrame, LegendItem, PALETTE } from '../components/charts/ChartFrame';
import { HBarSvg, HeatmapSvg, PieSvg, ScatterSvg, VBarSvg } from '../components/charts/Charts';
import { CodeTabs, Interp, NextStep, PageHeader, Section, Select, SimpleTable, Stat, Toggle } from '../components/ui';
import { FACTOR_COLUMNS, levelsOf, numericOf, valuesOf } from '../analysis/levels';
import { rBetween } from '../content/rcode';
import { useLang } from '../i18n/lang';
import { fmt, fmtP, pct } from '../lib/format';
import { extractFn } from '../lib/source';
import { useAnalysis } from '../state/analysis';
import { corMatrix, corTest, spearman } from '../stats/correlation';
import { frequencies, mean } from '../stats/descriptive';
import { fitLm } from '../stats/regression';
import descSrc from '../stats/descriptive.ts?raw';
import corSrc from '../stats/correlation.ts?raw';

function strength(r: number, L: (en: string, ar: string) => string): string {
  const a = Math.abs(r);
  const s = a >= 0.7 ? L('very strong', 'قوية جدًا') : a >= 0.5 ? L('strong', 'قوية') : a >= 0.3 ? L('moderate', 'متوسطة') : a >= 0.1 ? L('weak', 'ضعيفة') : L('negligible', 'مهملة');
  return `${s} ${r >= 0 ? L('positive', 'موجبة') : L('negative', 'سالبة')}`;
}

export default function Describe() {
  const A = useAnalysis();
  const { L } = useLang();
  const [freqVar, setFreqVar] = useState('Mjob');
  const [groupVar, setGroupVar] = useState('studytime_f');
  const [method, setMethod] = useState<'pearson' | 'spearman'>('pearson');
  const [cell, setCell] = useState<[number, number] | null>([2, 1]);

  const freqRows = useMemo(() => frequencies(valuesOf(A.clean, freqVar), levelsOf(A.clean, freqVar)), [A.clean, freqVar]);
  const top = [...freqRows].sort((a, b) => b.n - a.n)[0];

  const groups = useMemo(() => {
    const vals = valuesOf(A.clean, groupVar);
    return levelsOf(A.clean, groupVar)
      .map((level) => {
        const idx = vals.map((v, i) => (v === level ? i : -1)).filter((i) => i >= 0);
        return {
          level,
          n: idx.length,
          mean: mean(idx.map((i) => A.clean[i].G3)),
          pass: idx.filter((i) => A.clean[i].pass === 'Pass').length / idx.length,
        };
      })
      .filter((g) => g.n > 0);
  }, [A.clean, groupVar]);
  const best = [...groups].sort((a, b) => b.mean - a.mean)[0];
  const worst = [...groups].sort((a, b) => a.mean - b.mean)[0];

  const vars = A.cor_vars;
  const matrix = useMemo(
    () => (method === 'pearson' ? A.cor_mat : corMatrix(vars.map((v) => numericOf(A.clean, v)), 'spearman')),
    [method, A.cor_mat, A.clean, vars],
  );
  const g3i = vars.indexOf('G3');
  const ranked = vars.filter((v) => v !== 'G3').map((v) => ({ v, r: matrix[vars.indexOf(v)][g3i] })).sort((a, b) => a.r - b.r);

  const sel = cell ?? [2, 1];
  const xv = vars[sel[1]];
  const yv = vars[sel[0]];
  const xs = numericOf(A.clean, xv);
  const ys = numericOf(A.clean, yv);
  const ct = corTest(xs, ys);
  const rho = spearman(xs, ys);
  const fit = fitLm(xs.map((x) => [1, x]), ys, ['(Intercept)', xv]);

  const labelOf = (v: string) => v;
  return (
    <div>
      <PageHeader
        step={3}
        eyebrow={L('Descriptive statistics', 'الإحصاء الوصفي')}
        title={L('What the typical student looks like', 'كيف يبدو الطالب النموذجي')}
        lead={L(
          'Centre, spread and shape of the numeric variables; frequency tables for the categories; group comparisons; and how every pair of variables moves together.',
          'مقاييس النزعة المركزية والتشتت والشكل للمتغيرات الرقمية؛ وجداول التكرار للفئات؛ ومقارنات بين المجموعات؛ وكيف يتحرك كل زوج من المتغيرات معًا.',
        )}
      />

      <Section title={L('Summary table', 'جدول الملخص')} lead={L('Quartiles use R’s default quantile() (type 7); the mode is modeest::mfv().', 'الربيعيات محسوبة بطريقة quantile() الافتراضية في R (النوع 7)؛ والمنوال من modeest::mfv().')}>
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="tbl mono num text-sm" dir="ltr">
            <thead>
              <tr>{['variable', 'mean', 'median', 'mode', 'sd', 'var', 'min', 'Q1', 'Q3', 'max', 'IQR'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {A.desc.map((d) => (
                <tr key={d.variable} className={d.variable === 'G3' ? 'bg-tint' : ''}>
                  <td className="font-semibold">{d.variable}</td>
                  <td>{fmt(d.mean, 3)}</td><td>{d.median}</td><td>{d.mode}</td><td>{fmt(d.sd, 3)}</td><td>{fmt(d.var, 3)}</td>
                  <td>{d.min}</td><td>{d.q1}</td><td>{d.q3}</td><td>{d.max}</td><td>{d.IQR}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {(() => {
            const g = A.desc.find((d) => d.variable === 'G3')!;
            const ab = A.desc.find((d) => d.variable === 'absences')!;
            return (
              <Interp>
                {L(
                  `The average final grade is ${fmt(g.mean, 2)} (median ${g.median}, mode ${g.mode}, SD ${fmt(g.sd, 2)}). The mean sits slightly below the median because the ${A.zero_g3} zero grades pull it down. Absences are strongly right-skewed: the mean (${fmt(ab.mean, 2)}) is almost twice the median (${ab.median}) and the most common value is ${ab.mode}.`,
                  `متوسط العلامة النهائية ${fmt(g.mean, 2)} (الوسيط ${g.median}، المنوال ${g.mode}، الانحراف المعياري ${fmt(g.sd, 2)}). يقع المتوسط تحت الوسيط قليلًا لأن العلامات الصفرية الـ ${A.zero_g3} تسحبه للأسفل. أما الغياب فملتوٍ بشدة نحو اليمين: المتوسط (${fmt(ab.mean, 2)}) يقارب ضعف الوسيط (${ab.median})، والقيمة الأكثر تكرارًا هي ${ab.mode}.`,
                )}
              </Interp>
            );
          })()}
          <CodeTabs tabs={[
            { label: 'R', lang: 'r', code: rBetween('num_vars <-', 'quantile(df$G3)') + '\nquantile(df$G3)' },
            { label: 'TypeScript', lang: 'ts', code: `${extractFn(descSrc, 'quantile')}\n\n${extractFn(descSrc, 'mode')}` },
          ]} />
        </div>
  
      </Section>

      <Section title={L('Frequency distributions', 'التوزيعات التكرارية')} lead={L('Pick any categorical column.', 'اختر أي عمود فئوي.')}>
        <div className="card">
          <div className="max-w-xs">
            <Select label={L('Column', 'العمود')} value={freqVar} onChange={setFreqVar} options={FACTOR_COLUMNS.map((c) => ({ value: c, label: labelOf(c) }))} />
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <ChartFrame
              title={L(`Most common ${freqVar}: “${top.level}” (${pct(top.pct / 100)})`, `القيمة الأكثر شيوعًا لـ ${freqVar}: «${top.level}» (${pct(top.pct / 100)})`)}
              desc={L(`Bar chart of counts for ${freqVar}.`, `مخطط أعمدة لتكرارات ${freqVar}.`)}
              width={640}
              height={300}
              download={`freq-${freqVar}`}
            >
              <VBarSvg categories={freqRows.map((f) => f.level)} series={[{ name: 'n', color: 'var(--teal)', values: freqRows.map((f) => f.n) }]} yLabel={L('Students', 'الطلاب')} xLabel={freqVar} />
            </ChartFrame>
            <ChartFrame
              title={L(`Share of students by ${freqVar}`, `نسبة الطلاب حسب ${freqVar}`)}
              desc={L(`Donut chart of ${freqVar} shares.`, `مخطط دائري لنسب ${freqVar}.`)}
              width={640}
              height={300}
              legend={freqRows.map((f, i) => <LegendItem key={f.level} color={PALETTE[i % PALETTE.length]} label={f.level} />)}
            >
              <PieSvg slices={freqRows.map((f) => ({ label: f.level, value: f.n }))} size={300} />
            </ChartFrame>
          </div>
          <div className="mt-4">
            <SimpleTable head={[L('Level', 'المستوى'), 'n', '%']} rows={freqRows.map((f) => [f.level, f.n, fmt(f.pct, 2)])} numeric={[1, 2]} />
          </div>
        </div>
      </Section>

      <Section title={L('Group summaries', 'ملخصات المجموعات')} lead={L('Mean final grade and pass rate for each level of a categorical column (dplyr group_by + summarize).', 'متوسط العلامة النهائية ونسبة النجاح لكل مستوى من مستويات عمود فئوي (group_by وsummarize في dplyr).')}>
        <div className="card">
          <div className="max-w-xs">
            <Select label={L('Group by', 'التجميع حسب')} value={groupVar} onChange={setGroupVar} options={FACTOR_COLUMNS.filter((c) => c !== 'pass' && c !== 'grade_band').map((c) => ({ value: c, label: c }))} />
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <ChartFrame
              title={L(`“${best.level}” scores highest (${fmt(best.mean, 2)}), “${worst.level}” lowest (${fmt(worst.mean, 2)})`, `«${best.level}» الأعلى (${fmt(best.mean, 2)})، و«${worst.level}» الأدنى (${fmt(worst.mean, 2)})`)}
              desc={L(`Mean G3 by ${groupVar}.`, `متوسط G3 حسب ${groupVar}.`)}
              width={640}
              height={300}
              download={`mean-g3-by-${groupVar}`}
            >
              <VBarSvg categories={groups.map((g) => g.level)} series={[{ name: 'mean', color: 'var(--violet)', values: groups.map((g) => g.mean) }]} yLabel={L('Mean G3', 'متوسط G3')} xLabel={groupVar} valueFormat={(v) => fmt(v, 2)} yDomain={[0, 20]} />
            </ChartFrame>
            <ChartFrame title={L(`Pass rate by ${groupVar}`, `نسبة النجاح حسب ${groupVar}`)} desc={L(`Pass rate (%) by ${groupVar}.`, `نسبة النجاح (%) حسب ${groupVar}.`)} width={640} height={300}>
              <VBarSvg categories={groups.map((g) => g.level)} series={[{ name: 'pass', color: 'var(--teal)', values: groups.map((g) => g.pass * 100) }]} yLabel={L('Pass rate (%)', 'نسبة النجاح (%)')} xLabel={groupVar} valueFormat={(v) => fmt(v, 1)} yDomain={[0, 100]} />
            </ChartFrame>
          </div>
          <div className="mt-4">
            <SimpleTable head={[groupVar, 'n', L('mean G3', 'متوسط G3'), L('pass rate', 'نسبة النجاح')]} rows={groups.map((g) => [g.level, g.n, fmt(g.mean, 2), pct(g.pass)])} numeric={[1, 2, 3]} />
          </div>
          <div className="mt-4">
            <Interp>
              {L(
                `The gap between the best and worst group is ${fmt(best.mean - worst.mean, 2)} grade points. Whether such a gap is larger than chance is a question for the Test lab (t-test or ANOVA).`,
                `الفرق بين أفضل مجموعة وأسوئها ${fmt(best.mean - worst.mean, 2)} نقطة. أما ما إذا كان هذا الفرق أكبر من المصادفة، فسؤال يجيب عنه مختبر الاختبارات (اختبار t أو ANOVA).`,
              )}
            </Interp>
          </div>
        </div>
      </Section>

      <Section title={L('Correlation', 'الارتباط')} lead={L(`${vars.length} × ${vars.length} matrix. Hover a cell for r, click it to open the scatter plot and cor.test().`, `مصفوفة ${vars.length} × ${vars.length}. مرّر المؤشر على خلية لرؤية r، وانقر عليها لفتح مخطط الانتشار ونتيجة cor.test().`)}>
        <div className="mb-4 flex flex-wrap gap-4">
          <Toggle label={L('Spearman (rank) instead of Pearson', 'سبيرمان (الرتب) بدلًا من بيرسون')} checked={method === 'spearman'} onChange={(v) => setMethod(v ? 'spearman' : 'pearson')} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="card">
            <ChartFrame
              title={L(`G2 and G1 move with G3; failures pull it down (${method === 'pearson' ? 'Pearson' : 'Spearman'})`, `G2 وG1 يتحركان مع G3؛ والرسوب يخفضها (${method === 'pearson' ? 'بيرسون' : 'سبيرمان'})`)}
              desc={L('Correlation heat-map: teal positive, coral negative, darker is stronger.', 'خريطة حرارية للارتباط: الفيروزي موجب، والمرجاني سالب، والأغمق أقوى.')}
              width={640}
              height={640}
              download="correlation-heatmap"
              legend={<><LegendItem color="var(--teal)" shape="square" label={L('positive r', 'r موجب')} /><LegendItem color="var(--coral)" shape="square" label={L('negative r', 'r سالب')} /></>}
            >
              <HeatmapSvg vars={vars} matrix={matrix} selected={cell} onSelect={(i, j) => setCell([i, j])} />
            </ChartFrame>
            <div className="no-print mt-3 max-w-xs">
              <Select label={L('Or choose a pair (keyboard)', 'أو اختر زوجًا (لوحة المفاتيح)')} value={`${sel[0]}-${sel[1]}`} onChange={(v) => setCell(v.split('-').map(Number) as [number, number])}
                options={vars.flatMap((a, i) => vars.map((b, j) => ({ i, j, a, b }))).filter((p) => p.i < p.j).map((p) => ({ value: `${p.j}-${p.i}`, label: `${p.a} × ${p.b}` }))} />
            </div>
          </div>
          <div className="card">
            <ChartFrame
              title={L(`${xv} vs ${yv}: ${strength(ct.r, L)} (r = ${fmt(ct.r, 3)})`, `${xv} مقابل ${yv}: علاقة ${strength(ct.r, L)} (r = ${fmt(ct.r, 3)})`)}
              desc={L(`Jittered scatter plot of ${yv} against ${xv} with the least-squares line.`, `مخطط انتشار لـ ${yv} مقابل ${xv} مع خط المربعات الصغرى.`)}
              width={640}
              height={340}
              download={`scatter-${xv}-${yv}`}
            >
              <ScatterSvg points={xs.map((x, i) => ({ x, y: ys[i] }))} xLabel={xv} yLabel={yv} fit={{ a: fit.coef[0].estimate, b: fit.coef[1].estimate }} />
            </ChartFrame>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Pearson r" value={fmt(ct.r, 4)} />
              <Stat label="Spearman ρ" value={fmt(rho, 4)} />
              <Stat label={`t (df ${ct.df})`} value={fmt(ct.t, 3)} />
              <Stat label="p" value={fmtP(ct.p)} />
            </div>
            <p className="mono mt-3 text-xs text-muted" dir="ltr">95% CI [{fmt(ct.ci[0], 3)}, {fmt(ct.ci[1], 3)}]</p>
            <div className="mt-4">
              <CodeTabs tabs={[
                { label: 'R', lang: 'r', code: `cor.test(df$${xv}, df$${yv})\ncor(df$${xv}, df$${yv}, method = "spearman")` },
                { label: 'TypeScript', lang: 'ts', code: extractFn(corSrc, 'corTest') },
              ]} />
            </div>
          </div>
        </div>
        <div className="card mt-6">
          <ChartFrame
            className="max-w-3xl"
            title={L(`Strongest link with G3: ${ranked[ranked.length - 1].v} (${fmt(ranked[ranked.length - 1].r, 3)}); strongest negative: ${ranked[0].v} (${fmt(ranked[0].r, 3)})`, `أقوى ارتباط مع G3: ${ranked[ranked.length - 1].v} (${fmt(ranked[ranked.length - 1].r, 3)})؛ وأقوى ارتباط سالب: ${ranked[0].v} (${fmt(ranked[0].r, 3)})`)}
            desc={L('Ranked bar chart of correlations with G3.', 'مخطط أعمدة مرتب للارتباطات مع G3.')}
            width={640}
            height={ranked.length * 30 + 56}
            download="correlations-with-g3"
          >
            <HBarSvg bars={ranked.map((c) => ({ label: c.v, value: c.r, color: c.r >= 0 ? 'var(--teal)' : 'var(--coral)' }))} valueFormat={(v) => fmt(v, 3)} xLabel={method === 'pearson' ? 'Pearson r' : 'Spearman ρ'} domain={[-1, 1]} labelWidth={110} />
          </ChartFrame>
          <div className="mt-4">
            <Interp>
              {L(
                `Earlier grades dominate: r(G2, G3) = ${fmt(A.r_G2G3, 3)}. Without them, the strongest single signal is past failures (r = ${fmt(A.cor_test_fail.r, 3)}), followed by study time and parents’ education. Correlation is not causation: these are associations in observational data.`,
                `العلامات السابقة هي المسيطرة: r(G2، G3) = ${fmt(A.r_G2G3, 3)}. ومن دونها، فأقوى إشارة منفردة هي الرسوب السابق (r = ${fmt(A.cor_test_fail.r, 3)})، يليه وقت الدراسة وتعليم الوالدين. الارتباط لا يعني السببية: هذه علاقات في بيانات رصدية.`,
              )}
            </Interp>
          </div>
        </div>
      </Section>
      <NextStep to="/test" label={L('Test', 'الاختبارات')} />
    </div>
  );
}
