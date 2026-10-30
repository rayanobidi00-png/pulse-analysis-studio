import{u as V,a as q,r as N,N as v,O as B,Q as H,j as e,p as n,b as $,v as A,L as E,g as s,x as K,R as p,w as L,T as Y,U as I}from"./index-Ce2Qoe_D.js";import{P as Q,S as _,e as m,I as M,C,T as W,d as U,f as J,N as X,c as Z}from"./ui-C8t4mvcN.js";import{P as k,T as G}from"./terms-Cjg5wyJc.js";import{r as P}from"./rcode-AhXKElzi.js";import{e as w}from"./source-Yh5iNadF.js";const R=`// Linear (lm) and logistic (glm binomial, IRLS) regression with R-style summaries.
import { mean } from './descriptive';
import { pfUpper, pnorm2, pt2, pchisqUpper } from './dist';
import { crossprod, crossprodVec, dot, inverse, matVec, type Matrix } from './linalg';

export interface Coef {
  term: string;
  estimate: number;
  se: number;
  t: number;
  p: number;
}

export interface LinearModel {
  terms: string[];
  coef: Coef[];
  r2: number;
  adj_r2: number;
  sigma: number;
  F: number;
  df1: number;
  df2: number;
  p_overall: number;
  fitted: number[];
  residuals: number[];
  n: number;
}

export function fitLm(x: Matrix, y: readonly number[], terms: string[]): LinearModel {
  const n = y.length;
  const p = x[0].length;
  const xtxInv = inverse(crossprod(x));
  const beta = matVec(xtxInv, crossprodVec(x, y));
  const fitted = x.map((r) => dot(r, beta));
  const residuals = y.map((v, i) => v - fitted[i]);
  const rss = residuals.reduce((s, e) => s + e * e, 0);
  const my = mean(y);
  const tss = y.reduce((s, v) => s + (v - my) ** 2, 0);
  const df2 = n - p;
  const sigma2 = rss / df2;
  const coef = beta.map((b, j) => {
    const se = Math.sqrt(sigma2 * xtxInv[j][j]);
    const t = b / se;
    return { term: terms[j], estimate: b, se, t, p: pt2(t, df2) };
  });
  const r2 = 1 - rss / tss;
  const df1 = p - 1;
  const F = (tss - rss) / df1 / sigma2;
  return {
    terms,
    coef,
    r2,
    adj_r2: 1 - ((1 - r2) * (n - 1)) / df2,
    sigma: Math.sqrt(sigma2),
    F,
    df1,
    df2,
    p_overall: df1 > 0 ? pfUpper(F, df1, df2) : NaN,
    fitted,
    residuals,
    n,
  };
}

export interface LogisticModel {
  terms: string[];
  coef: Coef[];
  fitted: number[];
  deviance: number;
  nullDeviance: number;
  aic: number;
  lr_chi: number;
  lr_df: number;
  lr_p: number;
  iterations: number;
}

/**
 * glm(y ~ x, family = binomial) by iteratively reweighted least squares; y is 0/1.
 * Mirrors glm.fit: start at mu = (y + 0.5) / 2, stop when the relative deviance change < 1e-8,
 * and take standard errors from the weights of the last iteration (as summary.glm does).
 */
export function fitLogistic(x: Matrix, y: readonly number[], terms: string[]): LogisticModel {
  const n = y.length;
  const p = x[0].length;
  let mu = y.map((v) => (v + 0.5) / 2);
  let eta = mu.map((m) => Math.log(m / (1 - m)));
  let devOld = binomialDeviance(y, mu);
  let beta = new Array<number>(p).fill(0);
  let cov: Matrix = [];
  let dev = devOld;
  let it = 0;
  for (; it < 25; it++) {
    const w = mu.map((m) => m * (1 - m));
    const z = eta.map((e, i) => e + (y[i] - mu[i]) / w[i]);
    cov = inverse(crossprod(x, w));
    beta = matVec(cov, crossprodVec(x, z, w));
    eta = x.map((r) => dot(r, beta));
    mu = eta.map((e) => 1 / (1 + Math.exp(-e)));
    dev = binomialDeviance(y, mu);
    if (Math.abs(dev - devOld) / (Math.abs(dev) + 0.1) < 1e-8) break;
    devOld = dev;
  }
  const coef = beta.map((b, j) => {
    const se = Math.sqrt(cov[j][j]);
    const z = b / se;
    return { term: terms[j], estimate: b, se, t: z, p: pnorm2(z) };
  });
  const ybar = mean(y);
  const nullDeviance = binomialDeviance(y, new Array<number>(n).fill(ybar));
  const lr = nullDeviance - dev;
  return {
    terms,
    coef,
    fitted: mu,
    deviance: dev,
    nullDeviance,
    aic: dev + 2 * p,
    lr_chi: lr,
    lr_df: p - 1,
    lr_p: pchisqUpper(lr, p - 1),
    iterations: it + 1,
  };
}

function binomialDeviance(y: readonly number[], mu: readonly number[]): number {
  let d = 0;
  for (let i = 0; i < y.length; i++) {
    const m = Math.min(Math.max(mu[i], 1e-15), 1 - 1e-15);
    d += y[i] === 1 ? -2 * Math.log(m) : -2 * Math.log(1 - m);
  }
  return d;
}

export function predictLogistic(beta: readonly number[], row: readonly number[]): number {
  return 1 / (1 + Math.exp(-dot(row, beta)));
}

export interface Confusion {
  /** Rows = predicted (Fail, Pass), columns = actual (Fail, Pass), like R's table(Predicted, Actual). */
  matrix: [[number, number], [number, number]];
  accuracy: number;
  /** Share of actual fails the model catches (sensitivity for the "Fail" class). */
  failRecall: number;
  /** Share of actual passes predicted as pass. */
  passRecall: number;
  baseline: number;
}

/** prob = P(pass); predicted Pass when prob >= threshold. y: 1 = pass. */
export function confusion(prob: readonly number[], y: readonly number[], threshold = 0.5): Confusion {
  let ff = 0;
  let fp = 0;
  let pf = 0;
  let pp = 0;
  prob.forEach((pr, i) => {
    const predPass = pr >= threshold;
    if (!predPass && y[i] === 0) ff++;
    else if (!predPass && y[i] === 1) fp++;
    else if (predPass && y[i] === 0) pf++;
    else pp++;
  });
  const n = prob.length;
  const passes = fp + pp;
  return {
    matrix: [
      [ff, fp],
      [pf, pp],
    ],
    accuracy: (ff + pp) / n,
    failRecall: ff / (ff + pf),
    passRecall: pp / passes,
    baseline: Math.max(passes, n - passes) / n,
  };
}

export interface RocPoint {
  threshold: number;
  fpr: number;
  tpr: number;
}

/** ROC for detecting passes (positive class = 1) and AUC by the trapezoid rule. */
export function roc(prob: readonly number[], y: readonly number[]): { points: RocPoint[]; auc: number } {
  const pairs = prob.map((p, i) => [p, y[i]] as const).sort((a, b) => b[0] - a[0]);
  const P = y.filter((v) => v === 1).length;
  const N = y.length - P;
  const points: RocPoint[] = [{ threshold: Infinity, fpr: 0, tpr: 0 }];
  let tp = 0;
  let fp = 0;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i][1] === 1) tp++;
    else fp++;
    if (i === pairs.length - 1 || pairs[i + 1][0] !== pairs[i][0]) {
      points.push({ threshold: pairs[i][0], fpr: fp / N, tpr: tp / P });
    }
  }
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    auc += ((points[i].fpr - points[i - 1].fpr) * (points[i].tpr + points[i - 1].tpr)) / 2;
  }
  return { points, auc };
}
`;function S({coefs:o,L:t,stat:h="t"}){return e.jsx(Z,{head:[t("Term","الحد"),t("Estimate","التقدير"),t("Std. error","الخطأ المعياري"),h,"p"],rows:o.map(c=>{var x,y;return[t(((x=G[c.term])==null?void 0:x.en)??c.term,((y=G[c.term])==null?void 0:y.ar)??c.term),s(c.estimate,4),s(c.se,4),s(c.t,3),`${L(c.p)}${c.p<.001?" ***":c.p<.01?" **":c.p<.05?" *":""}`]}),numeric:[1,2,3,4]})}function ie(){const o=V(),{L:t}=q(),[h,c]=N.useState(v),[x,y]=N.useState(.5),r=o.lm_simple,d=N.useMemo(()=>h.length?B(o.clean,h):null,[o.clean,h]),l=o.lm_multi,b=o.logit,D=o.clean.map(a=>a.pass==="Pass"?1:0),i=H(b.fitted,D,x),f=o.logit_confusion,F={fpr:1-i.matrix[0][0]/(i.matrix[0][0]+i.matrix[1][0]),tpr:i.matrix[1][1]/(i.matrix[0][1]+i.matrix[1][1])},O=i.matrix[0][0]+i.matrix[1][0],z=a=>{var u,g;return t(((u=G[a])==null?void 0:u.en)??a,((g=G[a])==null?void 0:g.ar)??a)},T=((d==null?void 0:d.coef)??[]).slice(1).sort((a,u)=>u.estimate-a.estimate).map(a=>({label:z(a.term),value:a.estimate,color:a.p<.05?a.estimate>=0?"var(--teal)":"var(--coral)":"color-mix(in srgb, var(--muted) 45%, var(--surface))",note:a.p<.05?"":"ns"}));return e.jsxs("div",{children:[e.jsx(Q,{step:5,eyebrow:t("Regression · lm() · glm()","الانحدار · lm() · glm()"),title:t(`From ${n(r.r2,0)} explained to an early warning`,`من تفسير ${n(r.r2,0)} إلى إنذار مبكر`),lead:t("Three models: the second-period grade predicts the final grade almost perfectly but too late to help; an early-warning model uses only what is known before any exam; a logistic model turns that into a probability of passing.","ثلاثة نماذج: علامة الفترة الثانية تتنبأ بالعلامة النهائية بدقة شبه تامة لكن بعد فوات الأوان؛ ونموذج الإنذار المبكر يستخدم فقط ما يُعرف قبل أي امتحان؛ والنموذج اللوجستي يحوّل ذلك إلى احتمال نجاح.")}),e.jsxs(_,{title:t("1. Simple linear regression: G3 ~ G2","1. الانحدار الخطي البسيط: G3 ~ G2"),children:[e.jsxs("div",{className:"grid gap-6 xl:grid-cols-2",children:[e.jsx("div",{className:"card",children:e.jsx($,{title:t(`G3 = ${s(r.coef[0].estimate,2)} + ${s(r.coef[1].estimate,2)} × G2, R² = ${s(r.r2,3)}`,`G3 = ${s(r.coef[0].estimate,2)} + ${s(r.coef[1].estimate,2)} × G2، R² = ${s(r.r2,3)}`),desc:t("Scatter of G3 against G2, coral for fails, with the fitted line.","انتشار G3 مقابل G2، بالمرجاني للراسبين، مع الخط المقدّر."),width:640,height:360,download:"lm-g2-g3",legend:e.jsxs(e.Fragment,{children:[e.jsx(E,{color:"var(--violet)",label:t("pass","ناجح")}),e.jsx(E,{color:"var(--coral)",label:t("fail","راسب")})]}),children:e.jsx(A,{points:o.raw.map(a=>({x:a.G2,y:a.G3,color:a.G3>=10?"var(--violet)":"var(--coral)"})),xLabel:t("G2 (0–20)","G2 (0–20)"),yLabel:t("G3 (0–20)","G3 (0–20)"),xDomain:[0,20],yDomain:[0,20],fit:{a:r.coef[0].estimate,b:r.coef[1].estimate}})})}),e.jsx("div",{className:"card",children:e.jsx($,{title:t(`Residuals: typical error ${s(r.sigma,2)} points, but the zero grades break the pattern`,`البواقي: الخطأ النموذجي ${s(r.sigma,2)} نقطة، لكن العلامات الصفرية تكسر النمط`),desc:t("Residuals against fitted values.","البواقي مقابل القيم المقدّرة."),width:640,height:360,children:e.jsx(A,{points:r.fitted.map((a,u)=>({x:a,y:r.residuals[u],color:o.raw[u].G3===0?"var(--coral)":"var(--sky)"})),xLabel:t("Fitted G3","G3 المقدّرة"),yLabel:t("Residual","الباقي"),jitterAmount:.1})})})]}),e.jsxs("div",{className:"mt-5 grid gap-6 xl:grid-cols-2",children:[e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-3 gap-3",children:[e.jsx(m,{label:"R²",value:s(r.r2,4)}),e.jsx(m,{label:t("adj. R²","R² المعدل"),value:s(r.adj_r2,4)}),e.jsx(m,{label:t("residual SE","الخطأ المعياري للبواقي"),value:s(r.sigma,3)})]}),e.jsx(S,{coefs:r.coef,L:t}),e.jsx(M,{children:t(`Each extra point in G2 adds about ${s(r.coef[1].estimate,2)} points to G3, and G2 alone explains ${n(r.r2,1)} of the variation in final grades. Impressive, but useless for prevention: by the time G2 is known the year is almost over. The coral residuals are the students who scored 0 in the final exam despite a pass-level G2.`,`كل نقطة إضافية في G2 تضيف نحو ${s(r.coef[1].estimate,2)} نقطة إلى G3، وتفسّر G2 وحدها ${n(r.r2,1)} من تباين العلامات النهائية. نتيجة لافتة لكنها لا تفيد في الوقاية: فعندما تُعرف G2 تكون السنة قد أوشكت على الانتهاء. البواقي المرجانية هم الطلاب الذين حصلوا على صفر في الامتحان النهائي رغم علامة نجاح في G2.`)})]}),e.jsx(C,{tabs:[{label:"R",lang:"r",code:P("lm_simple <-","#     b)")},{label:"TypeScript",lang:"ts",code:w(R,"fitLm")}]})]})]}),e.jsx(_,{title:t("2. Multiple linear regression: an early-warning model","2. الانحدار الخطي المتعدد: نموذج إنذار مبكر"),lead:t("No G1 or G2: only information available at the start of the year. Toggle predictors to refit live.","دون G1 أو G2: فقط المعلومات المتاحة في بداية السنة. فعّل أو ألغِ المتنبئات لإعادة التقدير مباشرة."),children:e.jsxs("div",{className:"card",children:[e.jsxs("fieldset",{children:[e.jsx("legend",{className:"text-[13px] font-semibold text-muted",children:t("Predictors","المتنبئات")}),e.jsx("div",{className:"mt-2 flex flex-wrap gap-x-5 gap-y-2",children:v.map(a=>e.jsx(W,{label:t(k[a].en,k[a].ar),checked:h.includes(a),onChange:u=>c(g=>u?v.filter(j=>g.includes(j)||j===a):g.filter(j=>j!==a))},a))}),e.jsxs("div",{className:"mt-3 flex gap-2",children:[e.jsx("button",{type:"button",className:"chip hover:text-ink",onClick:()=>c(v),children:t("All 10 (the R model)","الكل (نموذج R)")}),e.jsx("button",{type:"button",className:"chip hover:text-ink",onClick:()=>c([]),children:t("None","لا شيء")})]})]}),d?e.jsxs("div",{className:"mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]",children:[e.jsx($,{title:t(`Early-warning model: R² = ${s(d.r2,3)} with ${h.length} predictors`,`نموذج الإنذار المبكر: R² = ${s(d.r2,3)} مع ${h.length} متنبئات`),subtitle:t("Change in G3 per unit (or vs the reference group), holding the others fixed; grey = not significant (p ≥ 0.05)","التغير في G3 لكل وحدة (أو مقارنة بالفئة المرجعية) مع تثبيت البقية؛ الرمادي = غير دال (p ≥ 0.05)"),desc:t("Horizontal bar chart of regression coefficients.","مخطط أعمدة أفقي لمعاملات الانحدار."),width:640,height:T.length*30+56,download:"early-warning-coefficients",children:e.jsx(K,{bars:T,valueFormat:a=>p(a,2),xLabel:t("Coefficient (grade points)","المعامل (نقاط علامة)"),labelWidth:160})}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsx(m,{label:"R²",value:s(d.r2,4),sub:h.length===v.length?"":t(`all 10: ${s(l.r2,4)}`,`الكل: ${s(l.r2,4)}`)}),e.jsx(m,{label:t("adj. R²","R² المعدل"),value:s(d.adj_r2,4)}),e.jsx(m,{label:`F (${d.df1}, ${d.df2})`,value:s(d.F,2),sub:`p = ${L(d.p_overall)}`}),e.jsx(m,{label:t("residual SE","الخطأ المعياري للبواقي"),value:s(d.sigma,3),sub:t("grade points","نقاط علامة")})]}),e.jsx(S,{coefs:d.coef,L:t})]})]}):e.jsx("p",{className:"mt-6 text-muted",children:t("Select at least one predictor.","اختر متنبئًا واحدًا على الأقل.")}),e.jsxs("div",{className:"mt-5 space-y-4",children:[e.jsx(M,{children:t(`Using only background information, the full model explains ${n(l.r2,1)} of the variation in G3 (adjusted ${n(l.adj_r2,1)}). Past failures (${p(l.coef[1].estimate,2)} per failure), school MS (${p(l.coef[4].estimate,2)}) and school support (${p(l.coef[9].estimate,2)}) pull grades down; wanting higher education (${p(l.coef[2].estimate,2)}) and study time (${p(l.coef[3].estimate,2)} per level) lift them. Absences and internet are not significant once the others are known.`,`باستخدام المعلومات الخلفية فقط، يفسّر النموذج الكامل ${n(l.r2,1)} من تباين G3 (المعدل ${n(l.adj_r2,1)}). الرسوب السابق (${p(l.coef[1].estimate,2)} لكل مرة) والمدرسة MS (${p(l.coef[4].estimate,2)}) ودعم المدرسة (${p(l.coef[9].estimate,2)}) تخفض العلامات؛ أما الرغبة في التعليم الجامعي (${p(l.coef[2].estimate,2)}) ووقت الدراسة (${p(l.coef[3].estimate,2)} لكل مستوى) فترفعها. الغياب والإنترنت غير دالين عند معرفة البقية.`)}),e.jsx(U,{children:t(`R² = ${s(l.r2,3)} means about two thirds of the variation is not explained, and the typical prediction error is ${s(l.sigma,1)} grade points. The negative “school support” effect is almost certainly reverse causation: weaker students are the ones who receive support.`,`R² = ${s(l.r2,3)} يعني أن نحو ثلثي التباين غير مفسَّر، وأن الخطأ النموذجي في التنبؤ ${s(l.sigma,1)} نقطة. والأثر السالب لـ«دعم المدرسة» يكاد يكون سببية معكوسة: فالطلاب الأضعف هم من يتلقون الدعم.`)}),e.jsx(C,{tabs:[{label:"R",lang:"r",code:P("lm_multi <-","#     c)")},{label:"TypeScript",lang:"ts",code:w(R,"fitLm")}]})]})]})}),e.jsx(_,{title:t("3. Logistic regression: probability of passing","3. الانحدار اللوجستي: احتمال النجاح"),lead:t(`glm(pass ~ …, family = binomial) with ${I.length} predictors. Move the threshold to trade missed fails against false alarms.`,`glm(pass ~ …, family = binomial) مع ${I.length} متنبئات. حرّك العتبة للموازنة بين الراسبين الذين لا يُكتشفون والإنذارات الكاذبة.`),children:e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"grid gap-6 xl:grid-cols-2",children:[e.jsxs("div",{className:"space-y-4",children:[e.jsx(S,{coefs:b.coef,L:t,stat:"z"}),e.jsxs("div",{className:"grid grid-cols-3 gap-3",children:[e.jsx(m,{label:"AIC",value:s(b.aic,2)}),e.jsx(m,{label:`LR χ² (df ${b.lr_df})`,value:s(b.lr_chi,2),sub:`p = ${L(b.lr_p)}`}),e.jsx(m,{label:t("odds ratio: failures","نسبة الأرجحية: الرسوب"),value:s(Math.exp(b.coef[1].estimate),3)})]})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsx(J,{label:t("Classification threshold: predict “Pass” when P(pass) ≥","عتبة التصنيف: نتوقع «ناجح» عندما P(النجاح) ≥"),value:x,min:.3,max:.95,step:.01,onChange:y,format:a=>a.toFixed(2)}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"tbl mono num text-sm",dir:"ltr",children:[e.jsx("caption",{className:"mb-2 text-start text-xs text-muted",children:t("Confusion matrix (rows = predicted, columns = actual)","مصفوفة الالتباس (الصفوف = المتوقع، الأعمدة = الفعلي)")}),e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{}),e.jsx("th",{children:t("actual Fail","راسب فعليًا")}),e.jsx("th",{children:t("actual Pass","ناجح فعليًا")})]})}),e.jsxs("tbody",{children:[e.jsxs("tr",{children:[e.jsx("th",{children:t("pred. Fail","متوقع راسب")}),e.jsx("td",{className:"bg-tint font-bold text-teal",children:i.matrix[0][0]}),e.jsx("td",{className:"text-coral",children:i.matrix[0][1]})]}),e.jsxs("tr",{children:[e.jsx("th",{children:t("pred. Pass","متوقع ناجح")}),e.jsx("td",{className:"bg-coral-tint font-bold text-coral",children:i.matrix[1][0]}),e.jsx("td",{className:"bg-tint font-bold text-teal",children:i.matrix[1][1]})]})]})]})}),e.jsxs("div",{className:"grid grid-cols-3 gap-3",children:[e.jsx(m,{label:t("accuracy","الدقة"),value:n(i.accuracy,1),sub:t(`baseline ${n(i.baseline,1)}`,`خط الأساس ${n(i.baseline,1)}`)}),e.jsx(m,{label:t("fails caught","راسبون مُكتشفون"),value:`${i.matrix[0][0]} / ${O}`,sub:n(i.failRecall,0)}),e.jsx(m,{label:"AUC",value:s(o.logit_roc.auc,3)})]})]})]}),e.jsxs("div",{className:"mt-6 grid gap-6 xl:grid-cols-2",children:[e.jsx($,{title:t(`ROC curve: AUC = ${s(o.logit_roc.auc,3)}`,`منحنى ROC: AUC = ${s(o.logit_roc.auc,3)}`),subtitle:t("Dot = current threshold","النقطة = العتبة الحالية"),desc:t("ROC curve of the logistic model with the diagonal of a random classifier.","منحنى ROC للنموذج اللوجستي مع القطر الذي يمثل المصنّف العشوائي."),width:640,height:340,download:"roc-curve",children:e.jsx(Y,{series:[{name:"roc",color:"var(--teal)",points:o.logit_roc.points.map(a=>[a.fpr,a.tpr])}],xLabel:t("False positive rate (fails predicted to pass)","معدل الإيجابيات الكاذبة (راسبون متوقع نجاحهم)"),yLabel:t("True positive rate","معدل الإيجابيات الصحيحة"),diagonal:!0,marker:[F.fpr,F.tpr]})}),e.jsxs("div",{className:"space-y-4",children:[e.jsx(M,{children:t(`At the usual 0.5 threshold the model is right ${n(f.accuracy,1)} of the time, only slightly better than the ${n(f.baseline,1)} you get by predicting “Pass” for everyone. It catches just ${f.matrix[0][0]} of the ${f.matrix[0][0]+f.matrix[1][0]} students who actually failed. Raising the threshold to ${x.toFixed(2)} catches ${i.matrix[0][0]} fails at the cost of ${i.matrix[0][1]} false alarms.`,`عند العتبة المعتادة 0.5 يصيب النموذج في ${n(f.accuracy,1)} من الحالات، وهذا أفضل بقليل فقط من ${n(f.baseline,1)} التي نحصل عليها بتوقع «ناجح» للجميع. ولا يكتشف إلا ${f.matrix[0][0]} من أصل ${f.matrix[0][0]+f.matrix[1][0]} طالبًا رسبوا فعلًا. وعند رفع العتبة إلى ${x.toFixed(2)} يكتشف ${i.matrix[0][0]} راسبًا مقابل ${i.matrix[0][1]} إنذارًا كاذبًا.`)}),e.jsx(U,{children:t(`Accuracy flatters an imbalanced outcome. For an early-warning tool, catching fails matters more than overall accuracy, so a threshold above 0.5 is the honest choice; the AUC of ${s(o.logit_roc.auc,2)} says the ranking is useful even when the 0.5 cut-off is not.`,`الدقة تجامل الناتج غير المتوازن. في أداة الإنذار المبكر، اكتشاف الراسبين أهم من الدقة الكلية، لذا فالعتبة الأعلى من 0.5 هي الخيار الأمين؛ وقيمة AUC البالغة ${s(o.logit_roc.auc,2)} تعني أن ترتيب الطلاب مفيد حتى لو لم تكن العتبة 0.5 كذلك.`)}),e.jsx(C,{tabs:[{label:"R",lang:"r",code:P("logit <- glm","# =====")},{label:"TypeScript",lang:"ts",code:`${w(R,"fitLogistic")}

${w(R,"roc")}`}]})]})]})]})}),e.jsx(X,{to:"/visualize",label:t("Visualize","التصوير")})]})}export{ie as default};
