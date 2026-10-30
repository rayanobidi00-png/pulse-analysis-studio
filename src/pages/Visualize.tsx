import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartFrame, LegendItem, PALETTE } from '../components/charts/ChartFrame';
import { BoxPlotSvg, HistogramSvg, PieSvg, ScatterSvg, VBarSvg } from '../components/charts/Charts';
import { CodeTabs, Interp, NextStep, PageHeader, Section, Select, Toggle } from '../components/ui';
import { FACTOR_COLUMNS, levelsOf, numericOf, valuesOf } from '../analysis/levels';
import { GALLERY, plotUrl } from '../content/gallery';
import { rBetween } from '../content/rcode';
import { useLang } from '../i18n/lang';
import { fmt } from '../lib/format';
import { useAnalysis } from '../state/analysis';
import { pearson } from '../stats/correlation';
import { boxStats, frequencies, mean, median, skewness } from '../stats/descriptive';
import { fitLm } from '../stats/regression';

type ChartType = 'histogram' | 'box' | 'bar' | 'grouped' | 'pie' | 'scatter';
const NUMERIC = ['G3', 'G2', 'G1', 'absences', 'age', 'avg_grade', 'alcohol', 'z_G3', 'z_absences', 'norm_absences', 'failures', 'studytime', 'Medu', 'Fedu', 'goout', 'Dalc', 'Walc', 'health', 'freetime', 'famrel', 'traveltime'];
const GROUPABLE = FACTOR_COLUMNS.filter((c) => c !== 'pass');

function Lightbox({ index, onClose, onMove }: { index: number; onClose: () => void; onMove: (d: number) => void }) {
  const { L, lang } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const item = GALLERY[index];
  return (
    <dialog
      ref={ref}
      className="m-auto max-h-[92vh] w-[min(1100px,94vw)] rounded-card border border-line bg-surface p-0 text-ink backdrop:bg-black/70"
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onMove(lang === 'ar' ? -1 : 1);
        if (e.key === 'ArrowLeft') onMove(lang === 'ar' ? 1 : -1);
      }}
      aria-label={L(item.en, item.ar)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="font-semibold">{index + 1}. {L(item.en, item.ar)}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost px-3" onClick={() => onMove(-1)} aria-label={L('Previous', 'السابق')}>‹</button>
          <button type="button" className="btn-ghost px-3" onClick={() => onMove(1)} aria-label={L('Next', 'التالي')}>›</button>
          <button type="button" className="btn-ghost px-3" onClick={() => ref.current?.close()}>{L('Close', 'إغلاق')}</button>
        </div>
      </div>
      <img src={plotUrl(item.file)} alt={L(item.en, item.ar)} width={item.w} height={item.h} className="mx-auto max-h-[78vh] w-auto bg-white object-contain" />
    </dialog>
  );
}

export default function Visualize() {
  const A = useAnalysis();
  const { L } = useLang();
  const [type, setType] = useState<ChartType>('histogram');
  const [num, setNum] = useState('G3');
  const [num2, setNum2] = useState('G2');
  const [cat, setCat] = useState('studytime_f');
  const [cat2, setCat2] = useState('sex');
  const [barMode, setBarMode] = useState<'count' | 'mean'>('count');
  const [showFit, setShowFit] = useState(true);
  const [colorPass, setColorPass] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const rows = A.clean;
  const types: { value: ChartType; label: string }[] = [
    { value: 'histogram', label: L('Histogram', 'مدرج تكراري') },
    { value: 'box', label: L('Box plot', 'مخطط صندوقي') },
    { value: 'bar', label: L('Bar chart', 'مخطط أعمدة') },
    { value: 'grouped', label: L('Grouped bar', 'أعمدة مجمّعة') },
    { value: 'pie', label: L('Pie chart', 'مخطط دائري') },
    { value: 'scatter', label: L('Scatter plot', 'مخطط انتشار') },
  ];

  const chart = useMemo(() => {
    const xs = numericOf(rows, num);
    if (type === 'histogram') {
      const m = mean(xs);
      const md = median(xs);
      const g1 = skewness(xs);
      const skew = g1 > 0.5 ? 'right' : g1 < -0.5 ? 'left' : 'none';
      const integer = xs.every((x) => Number.isInteger(x));
      const span = Math.max(...xs) - Math.min(...xs);
      return {
        title: L(`${num}: mean ${fmt(m, 2)}, median ${fmt(md, 2)}`, `${num}: المتوسط ${fmt(m, 2)}، الوسيط ${fmt(md, 2)}`),
        interp: L(
          `${num} ranges from ${fmt(Math.min(...xs), 2)} to ${fmt(Math.max(...xs), 2)}; skewness = ${fmt(g1, 2)}. ${skew === 'right' ? 'The distribution has a long right tail (a few large values pull the mean above the median).' : skew === 'left' ? 'The distribution has a long left tail (for grades, the zero scores) that pulls the mean below the median.' : 'The distribution is roughly symmetric, so mean and median tell the same story.'}`,
          `يتراوح ${num} بين ${fmt(Math.min(...xs), 2)} و${fmt(Math.max(...xs), 2)}؛ ومعامل الالتواء = ${fmt(g1, 2)}. ${skew === 'right' ? 'للتوزيع ذيل طويل نحو اليمين (قيم كبيرة قليلة ترفع المتوسط فوق الوسيط).' : skew === 'left' ? 'للتوزيع ذيل طويل نحو اليسار (في العلامات: الأصفار) يسحب المتوسط تحت الوسيط.' : 'التوزيع متماثل تقريبًا، فالمتوسط والوسيط يرويان القصة نفسها.'}`,
        ),
        r: `ggplot(students, aes(x = ${num})) +\n  geom_histogram(binwidth = ${integer ? 1 : fmt(span / 20, 3)}, fill = "#0F9D8A", colour = "white") +\n  geom_vline(xintercept = mean(students$${num}), linetype = "dashed")`,
        node: <HistogramSvg values={xs} binWidth={integer ? 1 : span / 20} xLabel={num} yLabel={L('Students', 'الطلاب')} colorFn={num === 'G3' ? (b) => (b >= 10 ? 'var(--teal)' : 'var(--coral)') : undefined} markers={[{ x: m, label: L(`mean ${fmt(m, 2)}`, `المتوسط ${fmt(m, 2)}`), color: 'var(--ink)', dashed: true }]} />,
      };
    }
    if (type === 'box') {
      const lv = levelsOf(rows, cat);
      const cv = valuesOf(rows, cat);
      const groups = lv.map((l, i) => ({ label: l, values: xs.filter((_, k) => cv[k] === l), color: PALETTE[i % PALETTE.length] })).filter((g) => g.values.length);
      const meds = groups.map((g) => ({ l: g.label, m: boxStats(g.values).median }));
      const hi = [...meds].sort((a, b) => b.m - a.m)[0];
      const lo = [...meds].sort((a, b) => a.m - b.m)[0];
      const out = groups.reduce((s, g) => s + boxStats(g.values).outliers.length, 0);
      return {
        title: L(`${num} by ${cat}: highest median in “${hi.l}” (${fmt(hi.m, 1)})`, `${num} حسب ${cat}: أعلى وسيط في «${hi.l}» (${fmt(hi.m, 1)})`),
        interp: L(
          `Medians run from ${fmt(lo.m, 1)} (“${lo.l}”) to ${fmt(hi.m, 1)} (“${hi.l}”). The boxes show the middle 50% of students; ${out} points fall outside the 1.5 × IQR whiskers. The diamond marks each group mean.`,
          `تتراوح الوسيطات بين ${fmt(lo.m, 1)} («${lo.l}») و${fmt(hi.m, 1)} («${hi.l}»). تُظهر الصناديق الـ 50% الوسطى من الطلاب؛ وتقع ${out} نقطة خارج شوارب 1.5 × IQR. ويمثل المعيّن متوسط كل مجموعة.`,
        ),
        r: `ggplot(students, aes(x = ${cat}, y = ${num}, fill = ${cat})) +\n  geom_boxplot(outlier.colour = "#E8604C") +\n  stat_summary(fun = mean, geom = "point", shape = 23, fill = "white")`,
        node: <BoxPlotSvg groups={groups} xLabel={cat} yLabel={num} />,
      };
    }
    if (type === 'bar' || type === 'pie') {
      const lv = levelsOf(rows, cat);
      const cv = valuesOf(rows, cat);
      if (type === 'bar' && barMode === 'mean') {
        const ms = lv.map((l) => mean(xs.filter((_, k) => cv[k] === l)));
        const best = lv[ms.indexOf(Math.max(...ms))];
        return {
          title: L(`Mean ${num} is highest for “${best}” (${fmt(Math.max(...ms), 2)})`, `متوسط ${num} هو الأعلى لـ«${best}» (${fmt(Math.max(...ms), 2)})`),
          interp: L(`Mean ${num} varies between ${fmt(Math.min(...ms), 2)} and ${fmt(Math.max(...ms), 2)} across the levels of ${cat}.`, `يتفاوت متوسط ${num} بين ${fmt(Math.min(...ms), 2)} و${fmt(Math.max(...ms), 2)} عبر مستويات ${cat}.`),
          r: `students %>% group_by(${cat}) %>% summarize(mean = mean(${num})) %>%\n  ggplot(aes(x = ${cat}, y = mean)) + geom_bar(stat = "identity")`,
          node: <VBarSvg categories={lv} series={[{ name: 'mean', color: 'var(--violet)', values: ms }]} yLabel={L(`Mean ${num}`, `متوسط ${num}`)} xLabel={cat} valueFormat={(v) => fmt(v, 2)} />,
        };
      }
      const fr = frequencies(cv, lv);
      const top = [...fr].sort((a, b) => b.n - a.n)[0];
      return {
        title: L(`“${top.level}” is the largest group of ${cat} (${fmt(top.pct, 1)}%)`, `«${top.level}» هي المجموعة الأكبر في ${cat} (${fmt(top.pct, 1)}%)`),
        interp: L(
          `${fr.length} levels; the largest holds ${top.n} students (${fmt(top.pct, 1)}%) and the smallest ${Math.min(...fr.map((f) => f.n))}. ${type === 'pie' ? 'A pie works for shares of a whole with few slices; for comparing many levels, a bar chart is easier to read.' : ''}`,
          `${fr.length} مستويات؛ أكبرها يضم ${top.n} طالبًا (${fmt(top.pct, 1)}%) وأصغرها ${Math.min(...fr.map((f) => f.n))}. ${type === 'pie' ? 'يصلح المخطط الدائري لعرض أجزاء من كل بعدد قليل من الشرائح؛ أما لمقارنة مستويات كثيرة فمخطط الأعمدة أسهل قراءة.' : ''}`,
        ),
        r: type === 'pie'
          ? `students %>% count(${cat}) %>%\n  ggplot(aes(x = "", y = n, fill = ${cat})) +\n  geom_bar(stat = "identity", width = 1) + coord_polar("y") + theme_void()`
          : `ggplot(students, aes(x = ${cat})) + geom_bar(fill = "#0F9D8A")`,
        node: type === 'pie' ? <PieSvg slices={fr.map((f) => ({ label: f.level, value: f.n }))} /> : <VBarSvg categories={lv} series={[{ name: 'n', color: 'var(--teal)', values: fr.map((f) => f.n) }]} yLabel={L('Students', 'الطلاب')} xLabel={cat} />,
        legend: type === 'pie' ? fr.map((f, i) => <LegendItem key={f.level} color={PALETTE[i % PALETTE.length]} label={f.level} />) : undefined,
      };
    }
    if (type === 'grouped') {
      const la = levelsOf(rows, cat);
      const lb = levelsOf(rows, cat2);
      const va = valuesOf(rows, cat);
      const vb = valuesOf(rows, cat2);
      const rate = (a: string, b: string) => {
        const idx = rows.map((_, i) => i).filter((i) => va[i] === a && vb[i] === b);
        return idx.length ? (100 * idx.filter((i) => rows[i].pass === 'Pass').length) / idx.length : 0;
      };
      const cells = la.flatMap((a) => lb.map((b) => ({ a, b, r: rate(a, b) })));
      const best = [...cells].sort((x, y) => y.r - x.r)[0];
      const worst = [...cells].sort((x, y) => x.r - y.r)[0];
      return {
        title: L(`Pass rate by ${cat} and ${cat2}: from ${fmt(worst.r, 1)}% to ${fmt(best.r, 1)}%`, `نسبة النجاح حسب ${cat} و${cat2}: من ${fmt(worst.r, 1)}% إلى ${fmt(best.r, 1)}%`),
        interp: L(`The highest pass rate is ${cat} = “${best.a}”, ${cat2} = “${best.b}” (${fmt(best.r, 1)}%); the lowest is “${worst.a}” / “${worst.b}” (${fmt(worst.r, 1)}%).`, `أعلى نسبة نجاح عند ${cat} = «${best.a}» و${cat2} = «${best.b}» (${fmt(best.r, 1)}%)؛ وأدناها عند «${worst.a}» / «${worst.b}» (${fmt(worst.r, 1)}%).`),
        r: `students %>% group_by(${cat}, ${cat2}) %>%\n  summarize(pass_rate = 100 * mean(pass == "Pass")) %>%\n  ggplot(aes(x = ${cat}, y = pass_rate, fill = ${cat2})) +\n  geom_bar(stat = "identity", position = position_dodge(.7))`,
        node: <VBarSvg categories={la} series={lb.map((b, j) => ({ name: b, color: PALETTE[j % PALETTE.length], values: la.map((a) => rate(a, b)) }))} yLabel={L('Pass rate (%)', 'نسبة النجاح (%)')} xLabel={cat} yDomain={[0, 100]} valueFormat={(v) => fmt(v, 0)} />,
        legend: lb.map((b, j) => <LegendItem key={b} color={PALETTE[j % PALETTE.length]} label={b} />),
      };
    }
    const ys = numericOf(rows, num2);
    const r = pearson(xs, ys);
    const f = fitLm(xs.map((x) => [1, x]), ys, ['(Intercept)', num]);
    const a = Math.abs(r);
    const strength = a >= 0.7 ? L('strong', 'قوية') : a >= 0.3 ? L('moderate', 'متوسطة') : a >= 0.1 ? L('weak', 'ضعيفة') : L('no clear', 'غير واضحة');
    return {
      title: L(`${num2} vs ${num}: r = ${fmt(r, 3)} (${strength} ${r >= 0 ? 'positive' : 'negative'} relationship)`, `${num2} مقابل ${num}: r = ${fmt(r, 3)} (علاقة ${strength} ${r >= 0 ? 'موجبة' : 'سالبة'})`),
      interp: L(
        `Each extra unit of ${num} goes with ${fmt(f.coef[1].estimate, 3)} units of ${num2} on average (R² = ${fmt(f.r2, 3)}). Points are jittered slightly because both variables take whole-number values.`,
        `كل وحدة إضافية من ${num} يقابلها في المتوسط ${fmt(f.coef[1].estimate, 3)} وحدة من ${num2} (R² = ${fmt(f.r2, 3)}). أُزيحت النقاط قليلًا لأن المتغيرين يأخذان قيمًا صحيحة.`,
      ),
      r: `ggplot(students, aes(x = ${num}, y = ${num2}${colorPass ? ', colour = pass' : ''})) +\n  geom_jitter(width = .25, height = .25, alpha = .5)${showFit ? ' +\n  geom_smooth(method = "lm")' : ''}`,
      node: <ScatterSvg points={xs.map((x, i) => ({ x, y: ys[i], color: colorPass ? (rows[i].pass === 'Pass' ? 'var(--teal)' : 'var(--coral)') : undefined }))} xLabel={num} yLabel={num2} fit={showFit ? { a: f.coef[0].estimate, b: f.coef[1].estimate } : undefined} />,
      legend: colorPass ? <><LegendItem color="var(--teal)" label={L('pass', 'ناجح')} /><LegendItem color="var(--coral)" label={L('fail', 'راسب')} /></> : undefined,
    };
  }, [type, num, num2, cat, cat2, barMode, showFit, colorPass, rows, L]);

  const needsNum = type === 'histogram' || type === 'box' || type === 'scatter' || (type === 'bar' && barMode === 'mean');
  const needsCat = type === 'box' || type === 'bar' || type === 'pie' || type === 'grouped';
  return (
    <div>
      <PageHeader
        step={6}
        eyebrow={L('Visualization', 'التصوير البياني')}
        title={L('Chart studio', 'استوديو الرسوم')}
        lead={L(
          'Build any of the six chart types the brief asks for, from any column. Every chart gets a title that states its finding, an automatic interpretation, the ggplot2 code, and PNG/SVG downloads.',
          'أنشئ أيًا من أنواع الرسوم الستة التي يطلبها المشروع، من أي عمود. يحصل كل رسم على عنوان يذكر نتيجته، وتفسير تلقائي، وكود ggplot2، وتنزيل بصيغتي PNG وSVG.',
        )}
      />
      <div className="card">
        <div role="tablist" aria-label={L('Chart type', 'نوع الرسم')} className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={type === t.value} className={type === t.value ? 'btn-primary' : 'btn-ghost'} onClick={() => setType(t.value)}>{t.label}</button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {needsNum && <Select label={type === 'scatter' ? L('X variable', 'المتغير X') : L('Numeric variable', 'متغير رقمي')} value={num} onChange={setNum} options={NUMERIC.map((c) => ({ value: c, label: c }))} />}
          {type === 'scatter' && <Select label={L('Y variable', 'المتغير Y')} value={num2} onChange={setNum2} options={NUMERIC.map((c) => ({ value: c, label: c }))} />}
          {needsCat && <Select label={type === 'grouped' ? L('Groups (x axis)', 'المجموعات (المحور X)') : L('Categorical variable', 'متغير فئوي')} value={cat} onChange={setCat} options={GROUPABLE.map((c) => ({ value: c, label: c }))} />}
          {type === 'grouped' && <Select label={L('Bars within group', 'الأعمدة داخل المجموعة')} value={cat2} onChange={setCat2} options={GROUPABLE.filter((c) => c !== cat).map((c) => ({ value: c, label: c }))} />}
          {type === 'bar' && <Select label={L('Bar height', 'ارتفاع العمود')} value={barMode} onChange={setBarMode} options={[{ value: 'count', label: L('Count', 'العدد') }, { value: 'mean', label: L('Mean of a numeric variable', 'متوسط متغير رقمي') }]} />}
          {type === 'scatter' && (
            <div className="flex flex-col justify-end gap-1">
              <Toggle label={L('Regression line', 'خط الانحدار')} checked={showFit} onChange={setShowFit} />
              <Toggle label={L('Colour by pass/fail', 'التلوين حسب النجاح/الرسوب')} checked={colorPass} onChange={setColorPass} />
            </div>
          )}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <ChartFrame title={chart.title} desc={chart.interp} width={640} height={type === 'pie' ? 320 : type === 'scatter' ? 340 : 300} download={`pulse-${type}`} legend={chart.legend}>
            {chart.node}
          </ChartFrame>
          <div className="space-y-4">
            <Interp>{chart.interp}</Interp>
            <CodeTabs tabs={[{ label: 'R (ggplot2)', lang: 'r', code: chart.r }]} />
          </div>
        </div>
      </div>

      <Section title={L('The original ggplot2 gallery', 'معرض ggplot2 الأصلي')} lead={L('The 11 charts produced by our R script. Click to enlarge; use the arrow keys to move between them.', 'الرسوم الـ 11 التي أنتجها سكربت R. انقر للتكبير، واستخدم مفاتيح الأسهم للتنقل بينها.')}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((g, i) => (
            <li key={g.file}>
              <button type="button" className="card block w-full p-3 text-start transition-colors hover:border-teal sm:p-3" onClick={() => setLightbox(i)}>
                <img src={plotUrl(g.file)} alt={L(g.en, g.ar)} loading="lazy" width={g.w} height={g.h} className="aspect-[16/10] w-full rounded-lg bg-white object-contain" />
                <span className="mt-2 block text-sm font-medium">{i + 1}. {L(g.en, g.ar)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5"><CodeTabs tabs={[{ label: 'R', lang: 'r', code: rBetween('m_G3 <- mean', '# =====') }]} /></div>
      </Section>
      {lightbox !== null && <Lightbox index={lightbox} onClose={() => setLightbox(null)} onMove={(d) => setLightbox((i) => ((i ?? 0) + d + GALLERY.length) % GALLERY.length)} />}
      <NextStep to="/predict" label={L('Predict', 'التنبؤ')} />
    </div>
  );
}
