// t-tests exactly as R's t.test(): one-sample, paired, and Welch two-sample (var.equal = FALSE).
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
