import { ChartFrame, LegendItem } from '../components/charts/ChartFrame';
import { BoxPlotSvg, HBarSvg, HistogramSvg, PieSvg, ScatterSvg, VBarSvg } from '../components/charts/Charts';
import { CodeTabs, PageHeader } from '../components/ui';
import { buildReport, reportToMarkdown, type ChartId } from '../analysis/report';
import { R_SCRIPT } from '../content/rcode';
import { TEAM } from '../content/team';
import { TERM_LABELS } from '../content/terms';
import { useLang } from '../i18n/lang';
import { downloadText } from '../lib/download';
import { fmt, signed } from '../lib/format';
import { useAnalysis } from '../state/analysis';

function ReportChart({ id, caption }: { id: ChartId; caption: string }) {
  const A = useAnalysis();
  const { L } = useLang();
  const g3 = A.raw.map((r) => r.G3);
  const common = { width: 640, download: `report-${id}` };
  switch (id) {
    case 'hist':
      return (
        <ChartFrame {...common} height={260} title={L(`Most grades sit between 10 and 14; ${A.pass_counts.Fail} students fail`, `معظم العلامات بين 10 و14؛ ويرسب ${A.pass_counts.Fail} طالبًا`)} subtitle={caption} desc={caption}>
          <HistogramSvg values={g3} domain={[0, 19]} xLabel={L('Final grade G3 (0–20)', 'العلامة النهائية G3 (0–20)')} yLabel={L('Students', 'الطلاب')} height={260} colorFn={(b) => (b >= 10 ? 'var(--teal)' : 'var(--coral)')} />
        </ChartFrame>
      );
    case 'box-fail':
      return (
        <ChartFrame {...common} height={260} title={L(`One past failure lowers the mean grade from ${fmt(A.by_fail[0].mean_G3, 1)} to ${fmt(A.by_fail[1].mean_G3, 1)}`, `رسوب سابق واحد يخفض المتوسط من ${fmt(A.by_fail[0].mean_G3, 1)} إلى ${fmt(A.by_fail[1].mean_G3, 1)}`)} subtitle={caption} desc={caption}>
          <BoxPlotSvg groups={A.by_fail.map((g, i) => ({ label: g.level, values: A.clean.filter((r) => r.failures_f === g.level).map((r) => r.G3), color: ['var(--teal)', 'var(--amber)', 'var(--coral)'][i] }))} xLabel={L('Past failures', 'الرسوب السابق')} yLabel="G3" height={260} yDomain={[0, 20]} />
        </ChartFrame>
      );
    case 'bar-mjob':
      return (
        <ChartFrame {...common} height={A.by_mjob.length * 30 + 56} title={L(`Mother’s job “${A.by_mjob[0].level}”: highest mean grade (${fmt(A.by_mjob[0].mean_G3, 2)}); “${A.by_mjob[A.by_mjob.length - 1].level}”: lowest (${fmt(A.by_mjob[A.by_mjob.length - 1].mean_G3, 2)})`, `عمل الأم «${A.by_mjob[0].level}»: أعلى متوسط (${fmt(A.by_mjob[0].mean_G3, 2)})؛ و«${A.by_mjob[A.by_mjob.length - 1].level}»: الأدنى (${fmt(A.by_mjob[A.by_mjob.length - 1].mean_G3, 2)})`)} subtitle={caption} desc={caption}>
          <HBarSvg bars={A.by_mjob.map((m) => ({ label: m.level, value: m.mean_G3, color: 'var(--sky)' }))} domain={[0, 15]} labelWidth={90} xLabel={L('Mean G3', 'متوسط G3')} />
        </ChartFrame>
      );
    case 'grouped': {
      const schools = ['Gabriel Pereira', 'Mousinho da Silveira'];
      const hi = [...A.by_school_sex].sort((a, b) => b.pass_rate - a.pass_rate)[0];
      const lo = [...A.by_school_sex].sort((a, b) => a.pass_rate - b.pass_rate)[0];
      return (
        <ChartFrame {...common} height={260} title={L(`Pass rate: ${fmt(hi.pass_rate, 1)}% (${hi.school}, ${hi.sex}) down to ${fmt(lo.pass_rate, 1)}% (${lo.school}, ${lo.sex})`, `نسبة النجاح: من ${fmt(hi.pass_rate, 1)}% (${hi.school}، ${hi.sex}) إلى ${fmt(lo.pass_rate, 1)}% (${lo.school}، ${lo.sex})`)} subtitle={caption} desc={caption} legend={<><LegendItem color="var(--coral)" label={L('Female', 'أنثى')} /><LegendItem color="var(--sky)" label={L('Male', 'ذكر')} /></>}>
          <VBarSvg categories={schools} series={['Female', 'Male'].map((sex, j) => ({ name: sex, color: j ? 'var(--sky)' : 'var(--coral)', values: schools.map((s) => A.by_school_sex.find((x) => x.school === s && x.sex === sex)!.pass_rate) }))} yLabel={L('Pass rate (%)', 'نسبة النجاح (%)')} height={260} yDomain={[0, 100]} valueFormat={(v) => fmt(v, 1)} />
        </ChartFrame>
      );
    }
    case 'pie':
      return (
        <ChartFrame {...common} height={300} title={L(`${fmt(A.pass_rate * 100, 1)}% of students pass`, `ينجح ${fmt(A.pass_rate * 100, 1)}% من الطلاب`)} subtitle={caption} desc={caption} legend={<><LegendItem color="var(--teal)" label={L('Pass', 'ناجح')} /><LegendItem color="var(--coral)" label={L('Fail', 'راسب')} /></>}>
          <PieSvg size={300} slices={[{ label: 'Pass', value: A.pass_counts.Pass, color: 'var(--teal)' }, { label: 'Fail', value: A.pass_counts.Fail, color: 'var(--coral)' }]} />
        </ChartFrame>
      );
    case 'scatter':
      return (
        <ChartFrame {...common} height={300} title={L(`G2 predicts G3 closely (r = ${fmt(A.r_G2G3, 3)})`, `G2 تتنبأ بـ G3 بدقة (r = ${fmt(A.r_G2G3, 3)})`)} subtitle={caption} desc={caption}>
          <ScatterSvg points={A.raw.map((r) => ({ x: r.G2, y: r.G3, color: r.G3 >= 10 ? 'var(--violet)' : 'var(--coral)' }))} xLabel="G2" yLabel="G3" height={300} xDomain={[0, 20]} yDomain={[0, 20]} fit={{ a: A.lm_simple.coef[0].estimate, b: A.lm_simple.coef[1].estimate }} />
        </ChartFrame>
      );
    case 'coef': {
      const bars = A.lm_multi.coef.slice(1).sort((a, b) => b.estimate - a.estimate).map((c) => ({ label: L(TERM_LABELS[c.term].en, TERM_LABELS[c.term].ar), value: c.estimate, color: c.p < 0.05 ? (c.estimate > 0 ? 'var(--teal)' : 'var(--coral)') : 'var(--line)', note: c.p < 0.05 ? '' : 'ns' }));
      return (
        <ChartFrame {...common} height={bars.length * 30 + 56} title={L(`Early-warning model: R² = ${fmt(A.lm_multi.r2, 3)}`, `نموذج الإنذار المبكر: R² = ${fmt(A.lm_multi.r2, 3)}`)} subtitle={caption} desc={caption}>
          <HBarSvg bars={bars} valueFormat={(v) => signed(v, 2)} labelWidth={160} />
        </ChartFrame>
      );
    }
    case 'cor':
      return (
        <ChartFrame {...common} height={A.cor_G3.length * 30 + 56} title={L(`Past failures is the strongest negative link with G3 (${fmt(A.cor_test_fail.r, 3)})`, `الرسوب السابق أقوى ارتباط سالب مع G3 (${fmt(A.cor_test_fail.r, 3)})`)} subtitle={caption} desc={caption}>
          <HBarSvg bars={A.cor_G3.map((c) => ({ label: c.variable, value: c.r, color: c.r >= 0 ? 'var(--teal)' : 'var(--coral)' }))} valueFormat={(v) => fmt(v, 3)} domain={[-1, 1]} labelWidth={100} />
        </ChartFrame>
      );
  }
}

export default function Report() {
  const A = useAnalysis();
  const { L, lang } = useLang();
  const sections = buildReport(A, L);
  const title = L('PULSE: what decides a student’s final grade?', 'PULSE: ما الذي يحدد العلامة النهائية للطالب؟');
  const md = () =>
    reportToMarkdown(sections, title, (c) => L(`*Chart: ${c} (see the website or the plots/ folder).*`, `*رسم: ${c} (انظر الموقع أو مجلد plots/).*`)) +
    `\n\n## ${L('Appendix: R code', 'ملحق: كود R')}\n\n\`\`\`r\n${R_SCRIPT}\n\`\`\`\n`;
  return (
    <div>
      <div className="no-print">
        <PageHeader
          step={8}
          eyebrow={L('Report', 'التقرير')}
          title={L('The full report, generated live', 'التقرير الكامل، مولَّدًا مباشرة')}
          lead={L(
            'Every stage, table, chart and interpretation in one printable document. All numbers are recomputed from the CSV when this page opens.',
            'كل المراحل والجداول والرسوم والتفسيرات في مستند واحد قابل للطباعة. يُعاد حساب جميع الأرقام من ملف CSV عند فتح هذه الصفحة.',
          )}
        />
        <div className="mb-8 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => window.print()}>{L('Download PDF (print)', 'تنزيل PDF (طباعة)')}</button>
          <button type="button" className="btn-ghost" onClick={() => downloadText(md(), `pulse-report-${lang}.md`, 'text/markdown')}>{L('Download Markdown', 'تنزيل Markdown')}</button>
        </div>
      </div>
      <article className="mx-auto max-w-4xl rounded-card border border-line bg-surface p-6 sm:p-10 print:border-0 print:p-0">
        <header className="border-b border-line pb-6">
          <p className="eyebrow">{L(TEAM.course.en, TEAM.course.ar)}</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-muted">
            {TEAM.members.map((m) => (m.id ? `${m.name} (${m.id})` : m.name)).join(' · ')}
            <br />
            {L('Instructor', 'المحاضر')}: {TEAM.instructor}
          </p>
        </header>
        {sections.map((s) => (
          <section key={s.id} className="mt-8">
            <h2 className="text-2xl font-extrabold">{s.title}</h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed">
              {s.blocks.map((b, i) => {
                if (b.kind === 'p') return <p key={i}>{b.text}</p>;
                if (b.kind === 'list') return <ul key={i} className="list-disc space-y-1 ps-6">{b.items.map((t) => <li key={t}>{t}</li>)}</ul>;
                if (b.kind === 'chart') return <div key={i} className="mx-auto max-w-2xl break-inside-avoid rounded-lg border border-line p-4"><ReportChart id={b.id} caption={b.caption} /></div>;
                return (
                  <div key={i} className="overflow-x-auto">
                    <table className="tbl text-xs">
                      <thead><tr>{b.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>{b.rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j} className={j > 0 ? 'mono num whitespace-nowrap' : ''}>{c}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        <section className="print-break mt-10">
          <h2 className="text-2xl font-extrabold">{L('Appendix: R code (pulse_analysis.R)', 'ملحق: كود R (pulse_analysis.R)')}</h2>
          <div className="mt-4 print:hidden"><CodeTabs tabs={[{ label: 'pulse_analysis.R', lang: 'r', code: R_SCRIPT }]} /></div>
          <pre className="mono hidden whitespace-pre-wrap text-[9px] leading-snug print:block" dir="ltr">{R_SCRIPT}</pre>
        </section>
      </article>
    </div>
  );
}
