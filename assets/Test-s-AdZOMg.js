import{u as Ve,a as Ce,r as k,y as De,z as Re,D as $e,E as je,G as ye,I as we,J as le,K as Be,s as Z,l as Pe,j as e,g as n,n as We,w as j,b as J,H as Se,B as ke,V as Ie,q as K,L as ze,v as Ue}from"./index-Ce2Qoe_D.js";import{e as l,P as Je,f as Ne,b as D,c as Ke,V as Me,C as qe,d as Ye,N as Qe,I as Xe}from"./ui-C8t4mvcN.js";import{l as M,v as q,n as ee}from"./levels-DRVsSW0a.js";import{a as Te,C as pe,B as Ze}from"./columns-BRXtsG-t.js";import{e as R}from"./source-Yh5iNadF.js";import{c as es}from"./correlation-DZPd-SZB.js";const ue=`// t-tests exactly as R's t.test(): one-sample, paired, and Welch two-sample (var.equal = FALSE).
import { mean, variance } from './descriptive';
import { pt2, qt } from './dist';

export interface TTest {
  kind: 'one' | 'paired' | 'welch';
  statistic: number;
  df: number;
  p: number;
  ci: [number, number];
  /** One-sample/paired: mean (of differences). Welch: [mean of group 1, mean of group 2]. */
  estimate: number | [number, number];
  se: number;
  /** Cohen's d (one-sample/paired: mean shift / sd; Welch: difference / pooled sd). */
  d: number;
}

export function tTestOne(x: readonly number[], mu = 0, conf = 0.95): TTest {
  const n = x.length;
  const m = mean(x);
  const s = Math.sqrt(variance(x));
  const se = s / Math.sqrt(n);
  const t = (m - mu) / se;
  const df = n - 1;
  const q = qt(1 - (1 - conf) / 2, df);
  return { kind: 'one', statistic: t, df, p: pt2(t, df), ci: [m - q * se, m + q * se], estimate: m, se, d: (m - mu) / s };
}

export function tTestPaired(x: readonly number[], y: readonly number[], conf = 0.95): TTest {
  const d = x.map((v, i) => v - y[i]);
  return { ...tTestOne(d, 0, conf), kind: 'paired' };
}

export function tTestWelch(x: readonly number[], y: readonly number[], conf = 0.95): TTest {
  const n1 = x.length;
  const n2 = y.length;
  const m1 = mean(x);
  const m2 = mean(y);
  const v1 = variance(x);
  const v2 = variance(y);
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = (m1 - m2) / se;
  const df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const q = qt(1 - (1 - conf) / 2, df);
  const pooled = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  return {
    kind: 'welch',
    statistic: t,
    df,
    p: pt2(t, df),
    ci: [m1 - m2 - q * se, m1 - m2 + q * se],
    estimate: [m1, m2],
    se,
    d: (m1 - m2) / pooled,
  };
}
`,ss=`// Chi-square test of independence, chisq.test(table, correct = FALSE).
import { pchisqUpper } from './dist';

export interface ChiSq {
  statistic: number;
  df: number;
  p: number;
  observed: number[][];
  expected: number[][];
  minExpected: number;
  rowLevels: string[];
  colLevels: string[];
  /** Cramér's V effect size. */
  cramerV: number;
}

export function crossTab(
  a: readonly string[],
  b: readonly string[],
  rowLevels?: readonly string[],
  colLevels?: readonly string[],
): { observed: number[][]; rowLevels: string[]; colLevels: string[] } {
  const rl = rowLevels ? [...rowLevels] : [...new Set(a)].sort();
  const cl = colLevels ? [...colLevels] : [...new Set(b)].sort();
  const observed = rl.map(() => cl.map(() => 0));
  for (let i = 0; i < a.length; i++) {
    const r = rl.indexOf(a[i]);
    const c = cl.indexOf(b[i]);
    if (r >= 0 && c >= 0) observed[r][c]++;
  }
  return { observed, rowLevels: rl, colLevels: cl };
}

export function chiSqTest(observed: number[][], rowLevels: string[] = [], colLevels: string[] = []): ChiSq {
  const rows = observed.map((r) => r.reduce((s, v) => s + v, 0));
  const cols = observed[0].map((_, j) => observed.reduce((s, r) => s + r[j], 0));
  const n = rows.reduce((s, v) => s + v, 0);
  const expected = observed.map((r, i) => r.map((_, j) => (rows[i] * cols[j]) / n));
  let stat = 0;
  observed.forEach((r, i) => r.forEach((o, j) => (stat += (o - expected[i][j]) ** 2 / expected[i][j])));
  const df = (observed.length - 1) * (observed[0].length - 1);
  const k = Math.min(observed.length, observed[0].length);
  return {
    statistic: stat,
    df,
    p: pchisqUpper(stat, df),
    observed,
    expected,
    minExpected: Math.min(...expected.flat()),
    rowLevels,
    colLevels,
    cramerV: Math.sqrt(stat / (n * (k - 1))),
  };
}
`,Ge=`// One-way ANOVA (aov) and Tukey HSD (TukeyHSD) for a numeric response and one factor.
import { mean } from './descriptive';
import { pfUpper, ptukey, qtukey } from './dist';

export interface GroupData {
  level: string;
  values: number[];
}

export interface Anova {
  F: number;
  df1: number;
  df2: number;
  p: number;
  ss_between: number;
  ss_within: number;
  msw: number;
  eta2: number;
  groups: { level: string; n: number; mean: number }[];
}

export function groupBy(values: readonly number[], factor: readonly string[], levels: readonly string[]): GroupData[] {
  return levels
    .map((level) => ({ level, values: values.filter((_, i) => factor[i] === level) }))
    .filter((g) => g.values.length > 0);
}

export function anovaOneWay(groups: GroupData[]): Anova {
  const all = groups.flatMap((g) => g.values);
  const grand = mean(all);
  let ssb = 0;
  let ssw = 0;
  for (const g of groups) {
    const m = mean(g.values);
    ssb += g.values.length * (m - grand) ** 2;
    for (const v of g.values) ssw += (v - m) ** 2;
  }
  const df1 = groups.length - 1;
  const df2 = all.length - groups.length;
  const F = ssb / df1 / (ssw / df2);
  return {
    F,
    df1,
    df2,
    p: pfUpper(F, df1, df2),
    ss_between: ssb,
    ss_within: ssw,
    msw: ssw / df2,
    eta2: ssb / (ssb + ssw),
    groups: groups.map((g) => ({ level: g.level, n: g.values.length, mean: mean(g.values) })),
  };
}

export interface TukeyRow {
  pair: string;
  a: string;
  b: string;
  diff: number;
  lwr: number;
  upr: number;
  padj: number;
}

/** TukeyHSD: every pair "later level - earlier level", in R's order. */
export function tukeyHSD(anova: Anova, conf = 0.95): TukeyRow[] {
  const k = anova.groups.length;
  const q = qtukey(conf, k, anova.df2);
  const rows: TukeyRow[] = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const gi = anova.groups[i];
      const gj = anova.groups[j];
      const diff = gj.mean - gi.mean;
      const se = Math.sqrt((anova.msw / 2) * (1 / gi.n + 1 / gj.n));
      const padj = 1 - ptukey(Math.abs(diff) / se, k, anova.df2);
      rows.push({
        pair: \`\${gj.level}-\${gi.level}\`,
        a: gj.level,
        b: gi.level,
        diff,
        lwr: diff - q * se,
        upr: diff + q * se,
        padj: Math.max(0, Math.min(1, padj)),
      });
    }
  }
  return rows;
}
`;function A(a,s){const r=Math.abs(a);return r>=.8?s("large","كبير"):r>=.5?s("medium","متوسط"):r>=.2?s("small","صغير"):s("negligible","مهمل")}function se({id:a,title:s,h0:r,h1:re,assumptions:y,stats:ie,p:te,alpha:O,interp:w,code:oe,chart:u,controls:ne}){const{L:m}=Ce(),ae=te<O;return e.jsxs("article",{id:a,className:"card scroll-mt-20","aria-labelledby":`${a}-h`,children:[e.jsxs("div",{className:"flex flex-wrap items-start justify-between gap-3",children:[e.jsx("h2",{id:`${a}-h`,className:"text-xl font-bold",children:s}),e.jsx(Me,{significant:ae,children:ae?m(`Reject H0 at α = ${O.toFixed(2)}`,`نرفض H0 عند α = ${O.toFixed(2)}`):m(`Do not reject H0 at α = ${O.toFixed(2)}`,`لا نرفض H0 عند α = ${O.toFixed(2)}`)})]}),ne&&e.jsx("div",{className:"no-print mt-4 grid gap-3 sm:grid-cols-3",children:ne}),e.jsxs("div",{className:"mt-5 grid gap-6 xl:grid-cols-2",children:[e.jsxs("div",{className:"min-w-0 space-y-4",children:[e.jsxs("div",{className:"grid gap-2 text-sm sm:grid-cols-2",children:[e.jsxs("p",{className:"rounded-lg bg-soft px-3 py-2",children:[e.jsx("b",{className:"mono",children:"H0"})," · ",r]}),e.jsxs("p",{className:"rounded-lg bg-soft px-3 py-2",children:[e.jsx("b",{className:"mono",children:"H1"})," · ",re]})]}),ie,e.jsxs("div",{children:[e.jsx("p",{className:"text-[13px] font-semibold text-muted",children:m("Assumptions","الافتراضات")}),e.jsx("ul",{className:"mt-2 space-y-1 text-sm",children:y.map(g=>e.jsxs("li",{className:"flex gap-2",children:[e.jsx("span",{"aria-hidden":!0,className:g.ok?"text-teal":"text-amber",children:g.ok?"✓":"!"}),e.jsx("span",{children:g.text})]},g.text))})]}),e.jsx(Xe,{children:w})]}),e.jsxs("div",{className:"min-w-0 space-y-4",children:[u,e.jsx(qe,{tabs:oe})]})]})]})}function N(a,s,r){return a<s?r(`p = ${j(a)} is below α = ${s.toFixed(2)}, so we reject H0`,`قيمة p = ${j(a)} أصغر من α = ${s.toFixed(2)}، لذلك نرفض H0`):r(`p = ${j(a)} is not below α = ${s.toFixed(2)}, so we cannot reject H0`,`قيمة p = ${j(a)} ليست أصغر من α = ${s.toFixed(2)}، لذلك لا نستطيع رفض H0`)}const Le=["G3","G2","G1","absences","age","failures","studytime","avg_grade","alcohol"];function os(){const a=Ve(),{L:s}=Ce(),[r,re]=k.useState(.05),[y,ie]=k.useState(10),[te,O]=k.useState("G3-G1"),[w,oe]=k.useState("sex"),[u,ne]=k.useState("higher"),[m,ae]=k.useState("pass"),[g,Fe]=k.useState("studytime_f"),[b,Ae]=k.useState("studytime"),[$,Oe]=k.useState("G3"),_=a.raw.map(t=>t.G3),o=De(_,y),[B,P]=te.split("-"),p=Re(a.raw.map(t=>t[B]),a.raw.map(t=>t[P])),E=a.raw.map(t=>t[B]-t[P]),v=M(a.clean,w),he=q(a.clean,w),T=a.clean.filter((t,i)=>he[i]===v[0]).map(t=>t.G3),G=a.clean.filter((t,i)=>he[i]===v[1]).map(t=>t.G3),c=$e(T,G),ce=je(q(a.clean,u),q(a.clean,m),M(a.clean,u),M(a.clean,m)),d=ye(ce.observed,ce.rowLevels,ce.colLevels),ge=M(a.clean,g),h=we(le(_,q(a.clean,g),ge)),Y=Be(h),xe=le(_,q(a.clean,g),ge).map(t=>Z(t.values)),Q=Math.max(...xe)/Math.min(...xe),_e=k.useMemo(()=>[...Te,"studytime_f","failures_f","Medu_f","grade_band"].filter(t=>M(a.clean,t).length>=3),[a.clean]),fe=[...Te,"pass","studytime_f","failures_f","Medu_f"],H=t=>{if(Le.includes(t)&&!pe.find(x=>x.name===t&&x.kind==="ordinal"))return"numeric";const i=pe.find(x=>x.name===t);return(i==null?void 0:i.kind)==="ordinal"?"ordinal":M(a.clean,t).length===2?"binary":"nominal"},ve=t=>{const i=H(t);return i==="numeric"?s("numeric","رقمي"):i==="ordinal"?s("ordinal","ترتيبي"):i==="binary"?s("binary","ثنائي"):s("nominal","اسمي")},be=[...new Set([...Le,...pe.map(t=>t.name),"pass","studytime_f","failures_f","Medu_f"])],W=(()=>{const t=H(b),i=H($),x=S=>S==="numeric"||S==="ordinal";if(b===$)return{test:s("Pick two different variables","اختر متغيرين مختلفين"),why:"",result:null,p:NaN};if(x(t)&&x(i)){const S=ee(a.clean,b),C=ee(a.clean,$),f=Pe(S,C),I=t==="ordinal"||i==="ordinal";return{test:I?s("Spearman rank correlation (+ Pearson cor.test)","ارتباط سبيرمان للرتب (+ اختبار بيرسون)"):s("Pearson correlation test, cor.test()","اختبار ارتباط بيرسون، cor.test()"),why:I?s("Both variables are ordered numbers, and at least one is an ordinal scale, so a rank-based correlation is the safer summary.","كلا المتغيرين أرقام مرتبة، وأحدهما على الأقل سلم ترتيبي، لذا فالارتباط المعتمد على الرتب أكثر أمانًا."):s("Both variables are numeric, so we measure their linear association.","كلا المتغيرين رقميان، لذا نقيس العلاقة الخطية بينهما."),p:f.p,result:e.jsxs("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-4",children:[e.jsx(l,{label:"r",value:n(f.r,4)}),e.jsx(l,{label:"ρ",value:n(We(S,C),4)}),e.jsx(l,{label:`t (df ${f.df})`,value:n(f.t,3)}),e.jsx(l,{label:"p",value:j(f.p)})]})}}if(x(t)!==x(i)){const S=x(t)?b:$,C=x(t)?$:b,f=M(a.clean,C),I=ee(a.clean,S),de=q(a.clean,C);if(f.length===2){const U=$e(I.filter((He,me)=>de[me]===f[0]),I.filter((He,me)=>de[me]===f[1]));return{test:s("Welch two-sample t-test","اختبار t لعينتين (ويلش)"),why:s(`${S} is numeric and ${C} splits students into two groups, so we compare two means without assuming equal variances.`,`${S} رقمي و${C} يقسم الطلاب إلى مجموعتين، لذا نقارن متوسطين دون افتراض تساوي التباين.`),p:U.p,result:e.jsxs("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-4",children:[e.jsx(l,{label:s(`mean ${f[0]}`,`متوسط ${f[0]}`),value:n(U.estimate[0],3)}),e.jsx(l,{label:s(`mean ${f[1]}`,`متوسط ${f[1]}`),value:n(U.estimate[1],3)}),e.jsx(l,{label:`t (df ${n(U.df,1)})`,value:n(U.statistic,3)}),e.jsx(l,{label:"p",value:j(U.p)})]})}}const z=we(le(I,de,f));return{test:s("One-way ANOVA","تحليل التباين الأحادي"),why:s(`${S} is numeric and ${C} has ${f.length} groups, so we compare several means at once (and follow up with Tukey HSD).`,`${S} رقمي و${C} فيه ${f.length} مجموعات، لذا نقارن عدة متوسطات معًا (ثم نتبع ذلك باختبار توكي).`),p:z.p,result:e.jsxs("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-4",children:[e.jsx(l,{label:`F (${z.df1}, ${z.df2})`,value:n(z.F,3)}),e.jsx(l,{label:"η²",value:n(z.eta2,3)}),e.jsx(l,{label:s("groups","المجموعات"),value:String(f.length)}),e.jsx(l,{label:"p",value:j(z.p)})]})}}const L=je(q(a.clean,b),q(a.clean,$),M(a.clean,b),M(a.clean,$)),F=ye(L.observed);return{test:s("Chi-square test of independence","اختبار مربع كاي للاستقلال"),why:s("Both variables are categorical, so we test whether the distribution of one depends on the other.","كلا المتغيرين فئويان، لذا نختبر ما إذا كان توزيع أحدهما يعتمد على الآخر."),p:F.p,result:e.jsxs("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-4",children:[e.jsx(l,{label:`χ² (df ${F.df})`,value:n(F.statistic,3)}),e.jsx(l,{label:"Cramér V",value:n(F.cramerV,3)}),e.jsx(l,{label:s("min expected","أدنى متوقع"),value:n(F.minExpected,2)}),e.jsx(l,{label:"p",value:j(F.p)})]})}})(),Ee=[["t-one",s("One-sample t","t لعينة واحدة")],["t-paired",s("Paired t","t للأزواج")],["t-welch",s("Welch t","t لويلش")],["chi",s("Chi-square","مربع كاي")],["anova","ANOVA"],["chooser",s("Test chooser","مساعد الاختيار")]],V=`${B} − ${P}`,X=t=>t<r?s("significant","دالّ إحصائيًا"):s("not significant","غير دالّ إحصائيًا");return e.jsxs("div",{children:[e.jsx(Je,{step:4,eyebrow:s("Inferential statistics","الإحصاء الاستدلالي"),title:s("The test lab","مختبر الاختبارات"),lead:s("Every test states its hypotheses, checks its assumptions, and reports the statistic, degrees of freedom, p-value, confidence interval and effect size. Move α and every decision updates; change the variables and every test reruns.","يحدد كل اختبار فرضياته، ويتحقق من افتراضاته، ويعرض الإحصاءة ودرجات الحرية وقيمة p وفترة الثقة وحجم الأثر. حرّك α فتتحدث كل القرارات؛ وغيّر المتغيرات فيُعاد تشغيل كل اختبار.")}),e.jsx("div",{className:"no-print sticky top-14 z-10 -mx-4 mb-6 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur",children:e.jsxs("div",{className:"flex flex-wrap items-center gap-x-6 gap-y-3",children:[e.jsx("div",{className:"w-56",children:e.jsx(Ne,{label:s("Significance level α","مستوى الدلالة α"),value:r,min:.01,max:.1,step:.01,onChange:re,format:t=>t.toFixed(2)})}),e.jsx("nav",{"aria-label":s("Tests","الاختبارات"),className:"flex flex-wrap gap-1.5",children:Ee.map(([t,i])=>e.jsx("a",{href:"#/test",onClick:x=>{var L;x.preventDefault(),(L=document.getElementById(t))==null||L.scrollIntoView({behavior:"smooth"})},className:"chip hover:text-ink",children:i},t))})]})}),e.jsxs("div",{className:"space-y-6",children:[e.jsx(se,{id:"t-one",title:s("One-sample t-test: is the mean final grade different from μ0?","اختبار t لعينة واحدة: هل يختلف متوسط العلامة النهائية عن μ0؟"),h0:`μ(G3) = ${y}`,h1:`μ(G3) ≠ ${y}`,alpha:r,p:o.p,controls:e.jsx(Ne,{label:s("μ0 (hypothesised mean)","μ0 (المتوسط المفترض)"),value:y,min:8,max:14,step:.5,onChange:ie,format:t=>t.toFixed(1)}),assumptions:[{ok:!0,text:s("Independent observations: one row per student.","مشاهدات مستقلة: صف واحد لكل طالب.")},{ok:!0,text:s(`n = ${_.length} is large, so the sampling distribution of the mean is close to normal (CLT) even though G3 is left-skewed by the zero grades.`,`n = ${_.length} كبيرة، لذا يقترب توزيع المعاينة للمتوسط من الطبيعي (نظرية النهاية المركزية) رغم التواء G3 لليسار بسبب العلامات الصفرية.`)}],stats:e.jsxs("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3",children:[e.jsx(l,{label:"t",value:n(o.statistic,3)}),e.jsx(l,{label:"df",value:String(o.df)}),e.jsx(l,{label:"p",value:j(o.p)}),e.jsx(l,{label:s("mean","المتوسط"),value:n(o.estimate,3)}),e.jsx(l,{label:"95% CI",value:`[${n(o.ci[0],2)}, ${n(o.ci[1],2)}]`}),e.jsx(l,{label:"Cohen d",value:n(o.d,2),sub:A(o.d,s)})]}),interp:s(`The mean final grade is ${n(o.estimate,2)} (95% CI ${n(o.ci[0],2)}–${n(o.ci[1],2)}). ${N(o.p,r,s)}: the average student ${o.p<r?o.statistic>0?"scores above":"scores below":"is not clearly different from"} ${y}. The effect size (d = ${n(o.d,2)}) is ${A(o.d,s)}.`,`متوسط العلامة النهائية ${n(o.estimate,2)} (فترة الثقة 95%: ${n(o.ci[0],2)}–${n(o.ci[1],2)}). ${N(o.p,r,s)}: ${o.p<r?o.statistic>0?"يحصل الطالب المتوسط على أعلى من":"يحصل الطالب المتوسط على أقل من":"لا يختلف الطالب المتوسط بوضوح عن"} ${y}. حجم الأثر (d = ${n(o.d,2)}) ${A(o.d,s)}.`),code:[{label:"R",lang:"r",code:`t_one <- t.test(df$G3, mu = ${y})
print(t_one)`},{label:"TypeScript",lang:"ts",code:R(ue,"tTestOne")}],chart:e.jsx(J,{title:s(`Sample mean ${n(o.estimate,2)} vs μ0 = ${y}`,`متوسط العينة ${n(o.estimate,2)} مقابل μ0 = ${y}`),desc:s("Histogram of G3 with the hypothesised and sample means.","مدرج تكراري لـ G3 مع المتوسط المفترض ومتوسط العينة."),width:640,height:240,children:e.jsx(Se,{values:_,domain:[0,19],xLabel:s("Final grade G3","العلامة النهائية G3"),yLabel:s("Students","الطلاب"),height:240,color:"var(--sky)",markers:[{x:y,label:`μ0 = ${y}`,color:"var(--coral)",dashed:!0},{x:o.estimate,label:"x̄",color:"var(--ink)"}]})})}),e.jsx(se,{id:"t-paired",title:s(`Paired t-test: did grades change (${V})?`,`اختبار t للأزواج: هل تغيرت العلامات (${V})؟`),h0:s(`mean difference ${V} = 0`,`متوسط الفرق ${V} = 0`),h1:s("mean difference ≠ 0","متوسط الفرق ≠ 0"),alpha:r,p:p.p,controls:e.jsx(D,{label:s("Pair","الزوج"),value:te,onChange:O,options:[{value:"G3-G1",label:"G3 − G1"},{value:"G3-G2",label:"G3 − G2"},{value:"G2-G1",label:"G2 − G1"}]}),assumptions:[{ok:!0,text:s("Both grades belong to the same student, so the samples are paired.","العلامتان للطالب نفسه، لذا العينتان مزدوجتان.")},{ok:!0,text:s(`n = ${E.length} differences: large enough for the CLT.`,`n = ${E.length} فرقًا: عدد كافٍ لتطبيق نظرية النهاية المركزية.`)}],stats:e.jsxs("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3",children:[e.jsx(l,{label:"t",value:n(p.statistic,3)}),e.jsx(l,{label:"df",value:String(p.df)}),e.jsx(l,{label:"p",value:j(p.p)}),e.jsx(l,{label:s("mean difference","متوسط الفرق"),value:n(p.estimate,4)}),e.jsx(l,{label:"95% CI",value:`[${n(p.ci[0],3)}, ${n(p.ci[1],3)}]`}),e.jsx(l,{label:"d",value:n(p.d,2),sub:A(p.d,s)})]}),interp:s(`On average ${B} is ${n(Math.abs(p.estimate),2)} points ${p.estimate>=0?"higher":"lower"} than ${P}. ${N(p.p,r,s)}. The change is ${X(p.p)} but ${A(p.d,s)} in size (d = ${n(p.d,2)}): statistically real, practically modest.`,`في المتوسط، ${B} ${p.estimate>=0?"أعلى":"أقل"} من ${P} بمقدار ${n(Math.abs(p.estimate),2)} نقطة. ${N(p.p,r,s)}. التغير ${X(p.p)} لكن حجمه ${A(p.d,s)} (d = ${n(p.d,2)}): حقيقي إحصائيًا ومتواضع عمليًا.`),code:[{label:"R",lang:"r",code:`t_paired <- t.test(df$${B}, df$${P}, paired = TRUE)
print(t_paired)`},{label:"TypeScript",lang:"ts",code:R(ue,"tTestPaired")}],chart:e.jsx(J,{title:s(`${n(100*E.filter(t=>Math.abs(t)<=1).length/E.length,0)}% of students change by at most 1 point (${V})`,`${n(100*E.filter(t=>Math.abs(t)<=1).length/E.length,0)}% من الطلاب تتغير علامتهم بنقطة واحدة على الأكثر (${V})`),desc:s("Histogram of the paired differences.","مدرج تكراري للفروق المزدوجة."),width:640,height:240,children:e.jsx(Se,{values:E,xLabel:V,yLabel:s("Students","الطلاب"),height:240,color:"var(--violet)",markers:[{x:0,label:"0",color:"var(--coral)",dashed:!0}]})})}),e.jsx(se,{id:"t-welch",title:s(`Welch two-sample t-test: G3 by ${w}`,`اختبار t لعينتين (ويلش): G3 حسب ${w}`),h0:`μ(${v[0]}) = μ(${v[1]})`,h1:`μ(${v[0]}) ≠ μ(${v[1]})`,alpha:r,p:c.p,controls:e.jsx(D,{label:s("Binary column","عمود ثنائي"),value:w,onChange:oe,options:Ze.map(t=>({value:t,label:t}))}),assumptions:[{ok:!0,text:s("Two independent groups of different students.","مجموعتان مستقلتان من طلاب مختلفين.")},{ok:Math.min(T.length,G.length)>=30,text:s(`Group sizes ${T.length} and ${G.length}${Math.min(T.length,G.length)<30?": the smaller group is under 30, so read the p-value with care":": both large"}.`,`حجما المجموعتين ${T.length} و${G.length}${Math.min(T.length,G.length)<30?": المجموعة الأصغر أقل من 30، لذا تُقرأ قيمة p بحذر":": كلاهما كبير"}.`)},{ok:!0,text:s(`Variances need not be equal (SD ${n(Z(T),2)} vs ${n(Z(G),2)}): Welch adjusts the df to ${n(c.df,1)}.`,`لا يلزم تساوي التباين (الانحراف ${n(Z(T),2)} مقابل ${n(Z(G),2)}): يعدّل ويلش درجات الحرية إلى ${n(c.df,1)}.`)}],stats:e.jsxs("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3",children:[e.jsx(l,{label:"t",value:n(c.statistic,3)}),e.jsx(l,{label:"df",value:n(c.df,2)}),e.jsx(l,{label:"p",value:j(c.p)}),e.jsx(l,{label:s(`mean ${v[0]}`,`متوسط ${v[0]}`),value:n(c.estimate[0],3)}),e.jsx(l,{label:s(`mean ${v[1]}`,`متوسط ${v[1]}`),value:n(c.estimate[1],3)}),e.jsx(l,{label:"95% CI",value:`[${n(c.ci[0],2)}, ${n(c.ci[1],2)}]`,sub:s("difference","الفرق")})]}),interp:s(`Students with ${w} = ${v[0]} average ${n(c.estimate[0],2)} and those with ${v[1]} average ${n(c.estimate[1],2)}. ${N(c.p,r,s)}; the difference is ${X(c.p)}, with a ${A(c.d,s)} effect (d = ${n(c.d,2)}).`,`متوسط الطلاب الذين ${w} = ${v[0]} هو ${n(c.estimate[0],2)}، ومتوسط ${v[1]} هو ${n(c.estimate[1],2)}. ${N(c.p,r,s)}؛ والفرق ${X(c.p)}، بحجم أثر ${A(c.d,s)} (d = ${n(c.d,2)}).`),code:[{label:"R",lang:"r",code:`t.test(G3 ~ ${w}, data = students)   # Welch is R's default`},{label:"TypeScript",lang:"ts",code:R(ue,"tTestWelch")}],chart:e.jsx(J,{title:s(`G3 by ${w}: a gap of ${n(Math.abs(c.estimate[0]-c.estimate[1]),2)} points`,`G3 حسب ${w}: فرق قدره ${n(Math.abs(c.estimate[0]-c.estimate[1]),2)} نقطة`),desc:s("Box plots of G3 for the two groups; diamond is the mean.","مخططات صندوقية لـ G3 للمجموعتين؛ المعيّن يمثل المتوسط."),width:640,height:260,children:e.jsx(ke,{groups:[{label:v[0],values:T,color:"var(--sky)"},{label:v[1],values:G,color:"var(--teal)"}],xLabel:w,yLabel:"G3",height:260,yDomain:[0,20]})})}),e.jsx(se,{id:"chi",title:s(`Chi-square test of independence: ${u} × ${m}`,`اختبار مربع كاي للاستقلال: ${u} × ${m}`),h0:s(`${u} and ${m} are independent`,`${u} و${m} مستقلان`),h1:s(`${u} and ${m} are associated`,`${u} و${m} مرتبطان`),alpha:r,p:d.p,controls:e.jsxs(e.Fragment,{children:[e.jsx(D,{label:s("Rows","الصفوف"),value:u,onChange:ne,options:fe.filter(t=>t!==m).map(t=>({value:t,label:t}))}),e.jsx(D,{label:s("Columns","الأعمدة"),value:m,onChange:ae,options:fe.filter(t=>t!==u).map(t=>({value:t,label:t}))})]}),assumptions:[{ok:!0,text:s("Each student is counted once (independent observations).","يُعدّ كل طالب مرة واحدة (مشاهدات مستقلة).")},{ok:d.minExpected>=5,text:s(`Minimum expected count = ${n(d.minExpected,2)} ${d.minExpected>=5?"(≥ 5, fine)":"(< 5: the χ² approximation is unreliable; merge levels or use fisher.test())"}.`,`أدنى تكرار متوقع = ${n(d.minExpected,2)} ${d.minExpected>=5?"(≥ 5، مقبول)":"(< 5: تقريب مربع كاي غير موثوق؛ ادمج المستويات أو استخدم fisher.test())"}.`)},{ok:!0,text:s("No continuity correction (correct = FALSE), as in our R script.","دون تصحيح الاستمرارية (correct = FALSE) كما في سكربت R.")}],stats:e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-4",children:[e.jsx(l,{label:"χ²",value:n(d.statistic,3)}),e.jsx(l,{label:"df",value:String(d.df)}),e.jsx(l,{label:"p",value:j(d.p)}),e.jsx(l,{label:"Cramér V",value:n(d.cramerV,3)})]}),e.jsxs("div",{className:"overflow-x-auto",children:[e.jsxs("table",{className:"tbl mono num text-xs",dir:"ltr",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsxs("th",{children:[u," \\ ",m]}),d.colLevels.map(t=>e.jsx("th",{children:t},t))]})}),e.jsx("tbody",{children:d.observed.map((t,i)=>e.jsxs("tr",{children:[e.jsx("td",{className:"font-semibold",children:d.rowLevels[i]}),t.map((x,L)=>e.jsxs("td",{children:[x," ",e.jsxs("span",{className:"text-muted",children:["(",n(d.expected[i][L],1),")"]})]},L))]},i))})]}),e.jsx("p",{className:"mt-1 text-xs text-muted",children:s("observed (expected)","المشاهد (المتوقع)")})]})]}),interp:s(`${N(d.p,r,s)}: ${d.p<r?`${m} depends on ${u}`:`we have no evidence that ${m} depends on ${u}`}. Cramér’s V = ${n(d.cramerV,2)} measures how strong the association is (0 = none, 1 = perfect).`,`${N(d.p,r,s)}: ${d.p<r?`${m} يعتمد على ${u}`:`لا دليل على أن ${m} يعتمد على ${u}`}. يقيس معامل كرامر V = ${n(d.cramerV,2)} قوة الارتباط (0 = لا ارتباط، 1 = تام).`),code:[{label:"R",lang:"r",code:`tab <- table(students$${u}, students$${m})
chisq.test(tab, correct = FALSE)
chisq.test(tab, correct = FALSE)$expected`},{label:"TypeScript",lang:"ts",code:R(ss,"chiSqTest")}],chart:e.jsx(J,{title:s(`Distribution of ${m} within each level of ${u}`,`توزيع ${m} داخل كل مستوى من ${u}`),desc:s("Grouped bars of row percentages.","أعمدة مجمّعة لنسب الصفوف."),width:640,height:260,legend:d.colLevels.map((t,i)=>e.jsx(ze,{color:t==="Fail"?"var(--coral)":t==="Pass"?"var(--teal)":K[i%K.length],label:t},t)),children:e.jsx(Ie,{categories:d.rowLevels,series:d.colLevels.map((t,i)=>({name:t,color:t==="Fail"?"var(--coral)":t==="Pass"?"var(--teal)":K[i%K.length],values:d.observed.map(x=>100*x[i]/x.reduce((L,F)=>L+F,0))})),yLabel:s("% of row","% من الصف"),height:260,valueFormat:t=>n(t,0),yDomain:[0,100]})})}),e.jsx(se,{id:"anova",title:s(`One-way ANOVA + Tukey HSD: G3 by ${g}`,`تحليل التباين الأحادي + توكي: G3 حسب ${g}`),h0:s("all group means are equal","جميع متوسطات المجموعات متساوية"),h1:s("at least one group mean differs","متوسط مجموعة واحدة على الأقل مختلف"),alpha:r,p:h.p,controls:e.jsx(D,{label:s("Factor","العامل"),value:g,onChange:Fe,options:_e.map(t=>({value:t,label:t}))}),assumptions:[{ok:!0,text:s("Independent groups of different students.","مجموعات مستقلة من طلاب مختلفين.")},{ok:Q<2,text:s(`Largest / smallest group SD = ${n(Q,2)} ${Q<2?"(< 2: equal-variance assumption is reasonable)":"(≥ 2: variances differ; consider oneway.test())"}.`,`نسبة أكبر انحراف معياري إلى أصغره = ${n(Q,2)} ${Q<2?"(< 2: افتراض تساوي التباين معقول)":"(≥ 2: التباينات مختلفة؛ يمكن استخدام oneway.test())"}.`)},{ok:Math.min(...h.groups.map(t=>t.n))>=10,text:s(`Smallest group n = ${Math.min(...h.groups.map(t=>t.n))}.`,`أصغر مجموعة n = ${Math.min(...h.groups.map(t=>t.n))}.`)}],stats:e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-4",children:[e.jsx(l,{label:"F",value:n(h.F,3)}),e.jsx(l,{label:"df",value:`${h.df1}, ${h.df2}`}),e.jsx(l,{label:"p",value:j(h.p)}),e.jsx(l,{label:"η²",value:n(h.eta2,3)})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[13px] font-semibold text-muted",children:"Tukey HSD (95%)"}),e.jsx(Ke,{head:[s("pair","الزوج"),"diff","lwr","upr","p adj"],rows:Y.map(t=>[t.pair,n(t.diff,3),n(t.lwr,3),n(t.upr,3),`${j(t.padj)}${t.padj<r?" *":""}`]),numeric:[0,1,2,3,4]})]})]}),interp:s(`${N(h.p,r,s)}. ${g} explains ${n(h.eta2*100,1)}% of the variance in G3 (η²). Tukey HSD finds ${Y.filter(t=>t.padj<r).length} of ${Y.length} pairs significantly different at α = ${r.toFixed(2)}; pairs whose interval crosses 0 are not.`,`${N(h.p,r,s)}. يفسّر ${g} نسبة ${n(h.eta2*100,1)}% من تباين G3 (η²). ويجد اختبار توكي ${Y.filter(t=>t.padj<r).length} من أصل ${Y.length} أزواج مختلفة بدلالة عند α = ${r.toFixed(2)}؛ أما الأزواج التي تتضمن فترتها الصفر فليست كذلك.`),code:[{label:"R",lang:"r",code:`a <- aov(G3 ~ ${g}, data = students)
summary(a)
TukeyHSD(a)`},{label:"TypeScript",lang:"ts",code:`${R(Ge,"anovaOneWay")}

${R(Ge,"tukeyHSD")}`}],chart:e.jsx(J,{title:s(`Mean G3 ranges from ${n(Math.min(...h.groups.map(t=>t.mean)),2)} to ${n(Math.max(...h.groups.map(t=>t.mean)),2)} across ${g}`,`يتراوح متوسط G3 بين ${n(Math.min(...h.groups.map(t=>t.mean)),2)} و${n(Math.max(...h.groups.map(t=>t.mean)),2)} عبر ${g}`),desc:s("Box plots of G3 per group.","مخططات صندوقية لـ G3 لكل مجموعة."),width:640,height:280,children:e.jsx(ke,{groups:h.groups.map((t,i)=>({label:t.level,values:le(_,q(a.clean,g),[t.level])[0].values,color:K[i%K.length]})),xLabel:g,yLabel:"G3",height:280,yDomain:[0,20]})})}),e.jsxs("article",{id:"chooser",className:"card scroll-mt-20",children:[e.jsx("h2",{className:"text-xl font-bold",children:s("Test chooser: which test fits my two variables?","مساعد اختيار الاختبار: أي اختبار يناسب متغيريّ؟")}),e.jsxs("div",{className:"no-print mt-4 grid gap-3 sm:grid-cols-3",children:[e.jsx(D,{label:s("Variable 1","المتغير 1"),value:b,onChange:Ae,options:be.map(t=>({value:t,label:`${t} · ${ve(t)}`}))}),e.jsx(D,{label:s("Variable 2","المتغير 2"),value:$,onChange:Oe,options:be.map(t=>({value:t,label:`${t} · ${ve(t)}`}))})]}),e.jsxs("div",{className:"mt-5 grid gap-6 lg:grid-cols-2",children:[e.jsxs("div",{className:"space-y-3",children:[e.jsx("p",{className:"text-lg font-bold text-teal",children:W.test}),e.jsx("p",{className:"text-sm text-muted",children:W.why}),W.result,Number.isFinite(W.p)&&e.jsxs(Me,{significant:W.p<r,children:[X(W.p)," (α = ",r.toFixed(2),")"]})]}),e.jsxs("div",{className:"rounded-lg bg-soft p-4 text-sm",children:[e.jsx("p",{className:"font-semibold",children:s("Decision rules","قواعد الاختيار")}),e.jsxs("ul",{className:"mt-2 list-disc space-y-1 ps-5 text-muted",children:[e.jsx("li",{children:s("numeric × numeric → Pearson cor.test (Spearman if ordinal)","رقمي × رقمي ← اختبار ارتباط بيرسون (سبيرمان إن كان ترتيبيًا)")}),e.jsx("li",{children:s("numeric × 2 groups → Welch t-test","رقمي × مجموعتان ← اختبار t لويلش")}),e.jsx("li",{children:s("numeric × 3+ groups → one-way ANOVA + Tukey","رقمي × 3 مجموعات فأكثر ← ANOVA أحادي + توكي")}),e.jsx("li",{children:s("categorical × categorical → chi-square","فئوي × فئوي ← مربع كاي")})]})]})]}),H(b)!=="nominal"&&H(b)!=="binary"&&H($)!=="nominal"&&H($)!=="binary"&&b!==$&&e.jsx("div",{className:"mt-5 max-w-2xl",children:e.jsx(J,{title:s(`${$} against ${b}`,`${$} مقابل ${b}`),desc:s("Scatter plot of the two chosen variables.","مخطط انتشار للمتغيرين المختارين."),width:640,height:280,children:e.jsx(Ue,{points:ee(a.clean,b).map((t,i)=>({x:t,y:ee(a.clean,$)[i]})),xLabel:b,yLabel:$,height:280})})}),e.jsx("div",{className:"mt-5",children:e.jsx(qe,{tabs:[{label:"TypeScript",lang:"ts",code:R(es,"spearman")}]})})]}),e.jsx(Ye,{children:s(`We ran many tests on the same data. At α = ${r.toFixed(2)}, about ${Math.round(r*100)} in 100 true-null tests would look significant by chance, so weak p-values near α deserve caution. Tests show association, not cause: these students were observed, not assigned.`,`أجرينا اختبارات كثيرة على البيانات نفسها. عند α = ${r.toFixed(2)}، سيبدو نحو ${Math.round(r*100)} من كل 100 اختبار صحيح الفرضية الصفرية دالًا بالمصادفة، لذا تستحق قيم p القريبة من α الحذر. الاختبارات تُظهر ارتباطًا لا سببية: هؤلاء الطلاب رُصدوا ولم يُوزَّعوا تجريبيًا.`)})]}),e.jsx(Qe,{to:"/model",label:s("Model","النمذجة")})]})}export{os as default};
