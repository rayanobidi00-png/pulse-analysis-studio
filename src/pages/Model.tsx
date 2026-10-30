import { useMemo, useState } from 'react';
import { ChartFrame, LegendItem } from '../components/charts/ChartFrame';
import { HBarSvg, LineSvg, ScatterSvg } from '../components/charts/Charts';
import { Caveat, CodeTabs, Interp, NextStep, PageHeader, Section, SimpleTable, Slider, Stat, Toggle } from '../components/ui';
import { fitMulti, LOGIT_KEYS, MULTI_KEYS, type PredictorKey } from '../analysis/models';
import { PREDICTOR_LABELS, TERM_LABELS } from '../content/terms';
import { rBetween } from '../content/rcode';
import { useLang } from '../i18n/lang';
import { fmt, fmtP, pct, signed } from '../lib/format';
import { extractFn } from '../lib/source';
import { useAnalysis } from '../state/analysis';
import { confusion, type Coef } from '../stats/regression';
import regSrc from '../stats/regression.ts?raw';

function CoefTable({ coefs, L, stat = 't' }: { coefs: Coef[]; L: (en: string, ar: string) => string; stat?: 't' | 'z' }) {
  return (
    <SimpleTable
      head={[L('Term', 'الحد'), L('Estimate', 'التقدير'), L('Std. error', 'الخطأ المعياري'), stat, 'p']}
      rows={coefs.map((c) => [L(TERM_LABELS[c.term]?.en ?? c.term, TERM_LABELS[c.term]?.ar ?? c.term), fmt(c.estimate, 4), fmt(c.se, 4), fmt(c.t, 3), `${fmtP(c.p)}${c.p < 0.001 ? ' ***' : c.p < 0.01 ? ' **' : c.p < 0.05 ? ' *' : ''}`])}
      numeric={[1, 2, 3, 4]}
    />
  );
}

export default function Model() {
  const A = useAnalysis();
  const { L } = useLang();
  const [keys, setKeys] = useState<PredictorKey[]>(MULTI_KEYS);
  const [threshold, setThreshold] = useState(0.5);

  const s = A.lm_simple;
  const multi = useMemo(() => (keys.length ? fitMulti(A.clean, keys) : null), [A.clean, keys]);
  const full = A.lm_multi;
  const logit = A.logit;
  const yPass = A.clean.map((r) => (r.pass === 'Pass' ? 1 : 0));
  const conf = confusion(logit.fitted, yPass, threshold);
  const conf05 = A.logit_confusion;
  const rocPt = { fpr: 1 - conf.matrix[0][0] / (conf.matrix[0][0] + conf.matrix[1][0]), tpr: conf.matrix[1][1] / (conf.matrix[0][1] + conf.matrix[1][1]) };
  const fails = conf.matrix[0][0] + conf.matrix[1][0];

  const termLabel = (t: string) => L(TERM_LABELS[t]?.en ?? t, TERM_LABELS[t]?.ar ?? t);
  const coefBars = (multi?.coef ?? []).slice(1).sort((a, b) => b.estimate - a.estimate).map((c) => ({
    label: termLabel(c.term),
    value: c.estimate,
    color: c.p < 0.05 ? (c.estimate >= 0 ? 'var(--teal)' : 'var(--coral)') : 'color-mix(in srgb, var(--muted) 45%, var(--surface))',
    note: c.p < 0.05 ? '' : 'ns',
  }));

  return (
    <div>
      <PageHeader
        step={5}
        eyebrow={L('Regression · lm() · glm()', 'الانحدار · lm() · glm()')}
        title={L(`From ${pct(s.r2, 0)} explained to an early warning`, `من تفسير ${pct(s.r2, 0)} إلى إنذار مبكر`)}
        lead={L(
          'Three models: the second-period grade predicts the final grade almost perfectly but too late to help; an early-warning model uses only what is known before any exam; a logistic model turns that into a probability of passing.',
          'ثلاثة نماذج: علامة الفترة الثانية تتنبأ بالعلامة النهائية بدقة شبه تامة لكن بعد فوات الأوان؛ ونموذج الإنذار المبكر يستخدم فقط ما يُعرف قبل أي امتحان؛ والنموذج اللوجستي يحوّل ذلك إلى احتمال نجاح.',
        )}
      />

      <Section title={L('1. Simple linear regression: G3 ~ G2', '1. الانحدار الخطي البسيط: G3 ~ G2')}>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="card">
            <ChartFrame
              title={L(`G3 = ${fmt(s.coef[0].estimate, 2)} + ${fmt(s.coef[1].estimate, 2)} × G2, R² = ${fmt(s.r2, 3)}`, `G3 = ${fmt(s.coef[0].estimate, 2)} + ${fmt(s.coef[1].estimate, 2)} × G2، R² = ${fmt(s.r2, 3)}`)}
              desc={L('Scatter of G3 against G2, coral for fails, with the fitted line.', 'انتشار G3 مقابل G2، بالمرجاني للراسبين، مع الخط المقدّر.')}
              width={640} height={360} download="lm-g2-g3"
              legend={<><LegendItem color="var(--violet)" label={L('pass', 'ناجح')} /><LegendItem color="var(--coral)" label={L('fail', 'راسب')} /></>}
            >
              <ScatterSvg points={A.raw.map((r) => ({ x: r.G2, y: r.G3, color: r.G3 >= 10 ? 'var(--violet)' : 'var(--coral)' }))} xLabel={L('G2 (0–20)', 'G2 (0–20)')} yLabel={L('G3 (0–20)', 'G3 (0–20)')} xDomain={[0, 20]} yDomain={[0, 20]} fit={{ a: s.coef[0].estimate, b: s.coef[1].estimate }} />
            </ChartFrame>
          </div>
          <div className="card">
            <ChartFrame
              title={L(`Residuals: typical error ${fmt(s.sigma, 2)} points, but the zero grades break the pattern`, `البواقي: الخطأ النموذجي ${fmt(s.sigma, 2)} نقطة، لكن العلامات الصفرية تكسر النمط`)}
              desc={L('Residuals against fitted values.', 'البواقي مقابل القيم المقدّرة.')}
              width={640} height={360}
            >
              <ScatterSvg points={s.fitted.map((f, i) => ({ x: f, y: s.residuals[i], color: A.raw[i].G3 === 0 ? 'var(--coral)' : 'var(--sky)' }))} xLabel={L('Fitted G3', 'G3 المقدّرة')} yLabel={L('Residual', 'الباقي')} jitterAmount={0.1} />
            </ChartFrame>
          </div>
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="R²" value={fmt(s.r2, 4)} /><Stat label={L('adj. R²', 'R² المعدل')} value={fmt(s.adj_r2, 4)} /><Stat label={L('residual SE', 'الخطأ المعياري للبواقي')} value={fmt(s.sigma, 3)} />
            </div>
            <CoefTable coefs={s.coef} L={L} />
            <Interp>
              {L(
                `Each extra point in G2 adds about ${fmt(s.coef[1].estimate, 2)} points to G3, and G2 alone explains ${pct(s.r2, 1)} of the variation in final grades. Impressive, but useless for prevention: by the time G2 is known the year is almost over. The coral residuals are the students who scored 0 in the final exam despite a pass-level G2.`,
                `كل نقطة إضافية في G2 تضيف نحو ${fmt(s.coef[1].estimate, 2)} نقطة إلى G3، وتفسّر G2 وحدها ${pct(s.r2, 1)} من تباين العلامات النهائية. نتيجة لافتة لكنها لا تفيد في الوقاية: فعندما تُعرف G2 تكون السنة قد أوشكت على الانتهاء. البواقي المرجانية هم الطلاب الذين حصلوا على صفر في الامتحان النهائي رغم علامة نجاح في G2.`,
              )}
            </Interp>
          </div>
          <CodeTabs tabs={[{ label: 'R', lang: 'r', code: rBetween('lm_simple <-', '#     b)') }, { label: 'TypeScript', lang: 'ts', code: extractFn(regSrc, 'fitLm') }]} />
        </div>
      </Section>

      <Section title={L('2. Multiple linear regression: an early-warning model', '2. الانحدار الخطي المتعدد: نموذج إنذار مبكر')} lead={L('No G1 or G2: only information available at the start of the year. Toggle predictors to refit live.', 'دون G1 أو G2: فقط المعلومات المتاحة في بداية السنة. فعّل أو ألغِ المتنبئات لإعادة التقدير مباشرة.')}>
        <div className="card">
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted">{L('Predictors', 'المتنبئات')}</legend>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {MULTI_KEYS.map((k) => (
                <Toggle key={k} label={L(PREDICTOR_LABELS[k].en, PREDICTOR_LABELS[k].ar)} checked={keys.includes(k)} onChange={(on) => setKeys((ks) => (on ? MULTI_KEYS.filter((x) => ks.includes(x) || x === k) : ks.filter((x) => x !== k)))} />
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className="chip hover:text-ink" onClick={() => setKeys(MULTI_KEYS)}>{L('All 10 (the R model)', 'الكل (نموذج R)')}</button>
              <button type="button" className="chip hover:text-ink" onClick={() => setKeys([])}>{L('None', 'لا شيء')}</button>
            </div>
          </fieldset>
          {multi ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <ChartFrame
                title={L(`Early-warning model: R² = ${fmt(multi.r2, 3)} with ${keys.length} predictors`, `نموذج الإنذار المبكر: R² = ${fmt(multi.r2, 3)} مع ${keys.length} متنبئات`)}
                subtitle={L('Change in G3 per unit (or vs the reference group), holding the others fixed; grey = not significant (p ≥ 0.05)', 'التغير في G3 لكل وحدة (أو مقارنة بالفئة المرجعية) مع تثبيت البقية؛ الرمادي = غير دال (p ≥ 0.05)')}
                desc={L('Horizontal bar chart of regression coefficients.', 'مخطط أعمدة أفقي لمعاملات الانحدار.')}
                width={640} height={coefBars.length * 30 + 56} download="early-warning-coefficients"
              >
                <HBarSvg bars={coefBars} valueFormat={(v) => signed(v, 2)} xLabel={L('Coefficient (grade points)', 'المعامل (نقاط علامة)')} labelWidth={160} />
              </ChartFrame>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="R²" value={fmt(multi.r2, 4)} sub={keys.length === MULTI_KEYS.length ? '' : L(`all 10: ${fmt(full.r2, 4)}`, `الكل: ${fmt(full.r2, 4)}`)} />
                  <Stat label={L('adj. R²', 'R² المعدل')} value={fmt(multi.adj_r2, 4)} />
                  <Stat label={`F (${multi.df1}, ${multi.df2})`} value={fmt(multi.F, 2)} sub={`p = ${fmtP(multi.p_overall)}`} />
                  <Stat label={L('residual SE', 'الخطأ المعياري للبواقي')} value={fmt(multi.sigma, 3)} sub={L('grade points', 'نقاط علامة')} />
                </div>
                <CoefTable coefs={multi.coef} L={L} />
              </div>
            </div>
          ) : (
            <p className="mt-6 text-muted">{L('Select at least one predictor.', 'اختر متنبئًا واحدًا على الأقل.')}</p>
          )}
          <div className="mt-5 space-y-4">
            <Interp>
              {L(
                `Using only background information, the full model explains ${pct(full.r2, 1)} of the variation in G3 (adjusted ${pct(full.adj_r2, 1)}). Past failures (${signed(full.coef[1].estimate, 2)} per failure), school MS (${signed(full.coef[4].estimate, 2)}) and school support (${signed(full.coef[9].estimate, 2)}) pull grades down; wanting higher education (${signed(full.coef[2].estimate, 2)}) and study time (${signed(full.coef[3].estimate, 2)} per level) lift them. Absences and internet are not significant once the others are known.`,
                `باستخدام المعلومات الخلفية فقط، يفسّر النموذج الكامل ${pct(full.r2, 1)} من تباين G3 (المعدل ${pct(full.adj_r2, 1)}). الرسوب السابق (${signed(full.coef[1].estimate, 2)} لكل مرة) والمدرسة MS (${signed(full.coef[4].estimate, 2)}) ودعم المدرسة (${signed(full.coef[9].estimate, 2)}) تخفض العلامات؛ أما الرغبة في التعليم الجامعي (${signed(full.coef[2].estimate, 2)}) ووقت الدراسة (${signed(full.coef[3].estimate, 2)} لكل مستوى) فترفعها. الغياب والإنترنت غير دالين عند معرفة البقية.`,
              )}
            </Interp>
            <Caveat>
              {L(
                `R² = ${fmt(full.r2, 3)} means about two thirds of the variation is not explained, and the typical prediction error is ${fmt(full.sigma, 1)} grade points. The negative “school support” effect is almost certainly reverse causation: weaker students are the ones who receive support.`,
                `R² = ${fmt(full.r2, 3)} يعني أن نحو ثلثي التباين غير مفسَّر، وأن الخطأ النموذجي في التنبؤ ${fmt(full.sigma, 1)} نقطة. والأثر السالب لـ«دعم المدرسة» يكاد يكون سببية معكوسة: فالطلاب الأضعف هم من يتلقون الدعم.`,
              )}
            </Caveat>
            <CodeTabs tabs={[{ label: 'R', lang: 'r', code: rBetween('lm_multi <-', '#     c)') }, { label: 'TypeScript', lang: 'ts', code: extractFn(regSrc, 'fitLm') }]} />
          </div>
        </div>
      </Section>

      <Section title={L('3. Logistic regression: probability of passing', '3. الانحدار اللوجستي: احتمال النجاح')} lead={L(`glm(pass ~ …, family = binomial) with ${LOGIT_KEYS.length} predictors. Move the threshold to trade missed fails against false alarms.`, `glm(pass ~ …, family = binomial) مع ${LOGIT_KEYS.length} متنبئات. حرّك العتبة للموازنة بين الراسبين الذين لا يُكتشفون والإنذارات الكاذبة.`)}>
        <div className="card">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <CoefTable coefs={logit.coef} L={L} stat="z" />
              <div className="grid grid-cols-3 gap-3">
                <Stat label="AIC" value={fmt(logit.aic, 2)} />
                <Stat label={`LR χ² (df ${logit.lr_df})`} value={fmt(logit.lr_chi, 2)} sub={`p = ${fmtP(logit.lr_p)}`} />
                <Stat label={L('odds ratio: failures', 'نسبة الأرجحية: الرسوب')} value={fmt(Math.exp(logit.coef[1].estimate), 3)} />
              </div>
            </div>
            <div className="space-y-4">
              <Slider label={L('Classification threshold: predict “Pass” when P(pass) ≥', 'عتبة التصنيف: نتوقع «ناجح» عندما P(النجاح) ≥')} value={threshold} min={0.3} max={0.95} step={0.01} onChange={setThreshold} format={(v) => v.toFixed(2)} />
              <div className="overflow-x-auto">
                <table className="tbl mono num text-sm" dir="ltr">
                  <caption className="mb-2 text-start text-xs text-muted">{L('Confusion matrix (rows = predicted, columns = actual)', 'مصفوفة الالتباس (الصفوف = المتوقع، الأعمدة = الفعلي)')}</caption>
                  <thead><tr><th /><th>{L('actual Fail', 'راسب فعليًا')}</th><th>{L('actual Pass', 'ناجح فعليًا')}</th></tr></thead>
                  <tbody>
                    <tr><th>{L('pred. Fail', 'متوقع راسب')}</th><td className="bg-tint font-bold text-teal">{conf.matrix[0][0]}</td><td className="text-coral">{conf.matrix[0][1]}</td></tr>
                    <tr><th>{L('pred. Pass', 'متوقع ناجح')}</th><td className="bg-coral-tint font-bold text-coral">{conf.matrix[1][0]}</td><td className="bg-tint font-bold text-teal">{conf.matrix[1][1]}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label={L('accuracy', 'الدقة')} value={pct(conf.accuracy, 1)} sub={L(`baseline ${pct(conf.baseline, 1)}`, `خط الأساس ${pct(conf.baseline, 1)}`)} />
                <Stat label={L('fails caught', 'راسبون مُكتشفون')} value={`${conf.matrix[0][0]} / ${fails}`} sub={pct(conf.failRecall, 0)} />
                <Stat label="AUC" value={fmt(A.logit_roc.auc, 3)} />
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <ChartFrame
              title={L(`ROC curve: AUC = ${fmt(A.logit_roc.auc, 3)}`, `منحنى ROC: AUC = ${fmt(A.logit_roc.auc, 3)}`)}
              subtitle={L('Dot = current threshold', 'النقطة = العتبة الحالية')}
              desc={L('ROC curve of the logistic model with the diagonal of a random classifier.', 'منحنى ROC للنموذج اللوجستي مع القطر الذي يمثل المصنّف العشوائي.')}
              width={640} height={340} download="roc-curve"
            >
              <LineSvg series={[{ name: 'roc', color: 'var(--teal)', points: A.logit_roc.points.map((p) => [p.fpr, p.tpr]) }]} xLabel={L('False positive rate (fails predicted to pass)', 'معدل الإيجابيات الكاذبة (راسبون متوقع نجاحهم)')} yLabel={L('True positive rate', 'معدل الإيجابيات الصحيحة')} diagonal marker={[rocPt.fpr, rocPt.tpr]} />
            </ChartFrame>
            <div className="space-y-4">
              <Interp>
                {L(
                  `At the usual 0.5 threshold the model is right ${pct(conf05.accuracy, 1)} of the time, only slightly better than the ${pct(conf05.baseline, 1)} you get by predicting “Pass” for everyone. It catches just ${conf05.matrix[0][0]} of the ${conf05.matrix[0][0] + conf05.matrix[1][0]} students who actually failed. Raising the threshold to ${threshold.toFixed(2)} catches ${conf.matrix[0][0]} fails at the cost of ${conf.matrix[0][1]} false alarms.`,
                  `عند العتبة المعتادة 0.5 يصيب النموذج في ${pct(conf05.accuracy, 1)} من الحالات، وهذا أفضل بقليل فقط من ${pct(conf05.baseline, 1)} التي نحصل عليها بتوقع «ناجح» للجميع. ولا يكتشف إلا ${conf05.matrix[0][0]} من أصل ${conf05.matrix[0][0] + conf05.matrix[1][0]} طالبًا رسبوا فعلًا. وعند رفع العتبة إلى ${threshold.toFixed(2)} يكتشف ${conf.matrix[0][0]} راسبًا مقابل ${conf.matrix[0][1]} إنذارًا كاذبًا.`,
                )}
              </Interp>
              <Caveat>
                {L(
                  `Accuracy flatters an imbalanced outcome. For an early-warning tool, catching fails matters more than overall accuracy, so a threshold above 0.5 is the honest choice; the AUC of ${fmt(A.logit_roc.auc, 2)} says the ranking is useful even when the 0.5 cut-off is not.`,
                  `الدقة تجامل الناتج غير المتوازن. في أداة الإنذار المبكر، اكتشاف الراسبين أهم من الدقة الكلية، لذا فالعتبة الأعلى من 0.5 هي الخيار الأمين؛ وقيمة AUC البالغة ${fmt(A.logit_roc.auc, 2)} تعني أن ترتيب الطلاب مفيد حتى لو لم تكن العتبة 0.5 كذلك.`,
                )}
              </Caveat>
              <CodeTabs tabs={[{ label: 'R', lang: 'r', code: rBetween('logit <- glm', '# =====') }, { label: 'TypeScript', lang: 'ts', code: `${extractFn(regSrc, 'fitLogistic')}\n\n${extractFn(regSrc, 'roc')}` }]} />
            </div>
          </div>
        </div>
      </Section>
      <NextStep to="/visualize" label={L('Visualize', 'التصوير')} />
    </div>
  );
}
