const r=`import { mean } from './descriptive';
import { pt2, qnorm } from './dist';

export function pearson(x: readonly number[], y: readonly number[]): number {
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}

/** Ranks with ties averaged (R's rank(ties.method = "average")). */
export function rank(x: readonly number[]): number[] {
  const idx = x.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(x.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

export function spearman(x: readonly number[], y: readonly number[]): number {
  return pearson(rank(x), rank(y));
}

export interface CorTest {
  r: number;
  t: number;
  df: number;
  p: number;
  ci: [number, number];
}

/** cor.test(x, y) with the Pearson method (t test and Fisher-z 95% CI). */
export function corTest(x: readonly number[], y: readonly number[], conf = 0.95): CorTest {
  const r = pearson(x, y);
  const n = x.length;
  const df = n - 2;
  const t = (r * Math.sqrt(df)) / Math.sqrt(1 - r * r);
  const z = Math.atanh(r);
  const se = 1 / Math.sqrt(n - 3);
  const zq = qnorm((1 + conf) / 2);
  return { r, t, df, p: pt2(t, df), ci: [Math.tanh(z - zq * se), Math.tanh(z + zq * se)] };
}

export function corMatrix(cols: readonly (readonly number[])[], method: 'pearson' | 'spearman' = 'pearson'): number[][] {
  const f = method === 'pearson' ? pearson : spearman;
  return cols.map((a, i) => cols.map((b, j) => (i === j ? 1 : f(a, b))));
}
`;export{r as c};
