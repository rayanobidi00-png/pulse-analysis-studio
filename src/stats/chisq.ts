// Chi-square test of independence, chisq.test(table, correct = FALSE).
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
