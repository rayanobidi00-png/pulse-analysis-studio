// Row-by-row comparison of R's results (results.json) with the TypeScript engine.
import type { Analysis } from './compute';

/* eslint-disable @typescript-eslint/no-explicit-any -- results.json is untyped R output */
export interface CompareRow {
  label: string;
  r: (R: any) => number;
  ts: (A: Analysis) => number;
  digits: number;
  /** p-values compare by relative error / order of magnitude. */
  isP?: boolean;
}

export const COMPARE_ROWS: CompareRow[] = [
  { label: 'rows', r: (R) => R.n_rows, ts: (A) => A.n_rows, digits: 0 },
  { label: 'columns', r: (R) => R.n_cols, ts: (A) => A.n_cols, digits: 0 },
  { label: 'total NA', r: (R) => R.total_na, ts: (A) => A.total_na, digits: 0 },
  { label: 'duplicates', r: (R) => R.duplicates, ts: (A) => A.duplicates, digits: 0 },
  { label: 'G3 = 0', r: (R) => R.zero_g3, ts: (A) => A.zero_g3, digits: 0 },
  { label: 'absences fence', r: (R) => R.absences_upper_fence, ts: (A) => A.absences_upper_fence, digits: 0 },
  { label: 'absences outliers', r: (R) => R.absences_outliers, ts: (A) => A.absences_outliers, digits: 0 },
  { label: 'mean(G3)', r: (R) => R.desc.find((d: any) => d.variable === 'G3').mean, ts: (A) => A.desc.find((d) => d.variable === 'G3')!.mean, digits: 4 },
  { label: 'sd(G3)', r: (R) => R.desc.find((d: any) => d.variable === 'G3').sd, ts: (A) => A.desc.find((d) => d.variable === 'G3')!.sd, digits: 4 },
  { label: 'median(G3)', r: (R) => R.desc.find((d: any) => d.variable === 'G3').median, ts: (A) => A.desc.find((d) => d.variable === 'G3')!.median, digits: 0 },
  { label: 'mode(G3)', r: (R) => R.desc.find((d: any) => d.variable === 'G3').mode, ts: (A) => A.desc.find((d) => d.variable === 'G3')!.mode, digits: 0 },
  { label: 'pass count', r: (R) => R.pass_counts.Pass, ts: (A) => A.pass_counts.Pass, digits: 0 },
  { label: 'r(G2, G3)', r: (R) => R.cor_test_G2G3.r, ts: (A) => A.cor_test_G2G3.r, digits: 4 },
  { label: 'Spearman ρ(studytime, G3)', r: (R) => R.spearman_study, ts: (A) => A.spearman_study, digits: 4 },
  { label: 'one-sample t', r: (R) => R.t_one.statistic, ts: (A) => A.t_one.statistic, digits: 3 },
  { label: 'one-sample p', r: (R) => R.t_one.p, ts: (A) => A.t_one.p, digits: 3, isP: true },
  { label: 'paired t', r: (R) => R.t_paired.statistic, ts: (A) => A.t_paired.statistic, digits: 3 },
  { label: 'Welch t (sex)', r: (R) => R.t_sex.statistic, ts: (A) => A.t_sex.statistic, digits: 3 },
  { label: 'Welch df (sex)', r: (R) => R.t_sex.df, ts: (A) => A.t_sex.df, digits: 2 },
  { label: 'Welch t (higher)', r: (R) => R.t_higher.statistic, ts: (A) => A.t_higher.statistic, digits: 3 },
  { label: 'Welch t (school)', r: (R) => R.t_school.statistic, ts: (A) => A.t_school.statistic, digits: 3 },
  { label: 'χ² (higher × pass)', r: (R) => R.chi_higher.statistic, ts: (A) => A.chi_higher.statistic, digits: 3 },
  { label: 'χ² (school × pass)', r: (R) => R.chi_school.statistic, ts: (A) => A.chi_school.statistic, digits: 3 },
  { label: 'χ² (sex × pass)', r: (R) => R.chi_sex.statistic, ts: (A) => A.chi_sex.statistic, digits: 3 },
  { label: 'χ² p (sex)', r: (R) => R.chi_sex.p, ts: (A) => A.chi_sex.p, digits: 4, isP: true },
  { label: 'ANOVA F (study time)', r: (R) => R.anova_study.F, ts: (A) => A.anova_study.F, digits: 3 },
  { label: 'ANOVA F (failures)', r: (R) => R.anova_fail.F, ts: (A) => A.anova_fail.F, digits: 3 },
  { label: 'ANOVA F (Medu)', r: (R) => R.anova_medu.F, ts: (A) => A.anova_medu.F, digits: 3 },
  { label: 'Tukey p (5-10 h vs 2-5 h)', r: (R) => R.tukey_study[3]['p adj'], ts: (A) => A.tukey_study[3].padj, digits: 4 },
  { label: 'lm G3~G2 slope', r: (R) => R.lm_simple.coef[1].estimate, ts: (A) => A.lm_simple.coef[1].estimate, digits: 4 },
  { label: 'lm G3~G2 R²', r: (R) => R.lm_simple.r2, ts: (A) => A.lm_simple.r2, digits: 4 },
  { label: 'multiple lm R²', r: (R) => R.lm_multi.r2, ts: (A) => A.lm_multi.r2, digits: 4 },
  { label: 'multiple lm adj. R²', r: (R) => R.lm_multi.adj_r2, ts: (A) => A.lm_multi.adj_r2, digits: 4 },
  { label: 'multiple lm F', r: (R) => R.lm_multi.F, ts: (A) => A.lm_multi.F, digits: 2 },
  { label: 'logistic AIC', r: (R) => R.logit.aic, ts: (A) => A.logit.aic, digits: 2 },
  { label: 'logistic accuracy', r: (R) => R.logit.accuracy, ts: (A) => A.logit_confusion.accuracy, digits: 4 },
  { label: 'logistic β(failures)', r: (R) => R.logit.coef[1].estimate, ts: (A) => A.logit.coef[1].estimate, digits: 4 },
];

export function matches(row: CompareRow, r: number, ts: number): boolean {
  if (row.isP) {
    if (r > 1e-10) return Math.abs(r - ts) / r <= 1e-4;
    return Math.abs(Math.log10(r) - Math.log10(ts)) < 1;
  }
  return Math.abs(r - ts) <= 1e-3;
}
