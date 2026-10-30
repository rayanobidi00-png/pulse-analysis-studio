const n=`// Descriptive statistics that reproduce base R (mean, median, var, sd, quantile type 7, IQR).

export function sum(x: readonly number[]): number {
  let s = 0;
  for (const v of x) s += v;
  return s;
}

export function mean(x: readonly number[]): number {
  return sum(x) / x.length;
}

export function variance(x: readonly number[]): number {
  const m = mean(x);
  let s = 0;
  for (const v of x) s += (v - m) ** 2;
  return s / (x.length - 1);
}

export function sd(x: readonly number[]): number {
  return Math.sqrt(variance(x));
}

/** R's quantile(x, p) with the default type 7. */
export function quantile(x: readonly number[], p: number): number {
  const s = [...x].sort((a, b) => a - b);
  const h = (s.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return s[lo] + (h - lo) * (s[hi] - s[lo]);
}

export function median(x: readonly number[]): number {
  return quantile(x, 0.5);
}

export function iqr(x: readonly number[]): number {
  return quantile(x, 0.75) - quantile(x, 0.25);
}

/** modeest::mfv(x)[1]: the most frequent value (smallest one when tied). */
export function mode(x: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const v of x) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = NaN;
  let bestN = -1;
  for (const [v, n] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

export function min(x: readonly number[]): number {
  return x.reduce((a, b) => (b < a ? b : a), Infinity);
}

export function max(x: readonly number[]): number {
  return x.reduce((a, b) => (b > a ? b : a), -Infinity);
}

export interface Describe {
  n: number;
  mean: number;
  median: number;
  mode: number;
  sd: number;
  var: number;
  min: number;
  q1: number;
  q3: number;
  max: number;
  IQR: number;
}

export function describe(x: readonly number[]): Describe {
  return {
    n: x.length,
    mean: mean(x),
    median: median(x),
    mode: mode(x),
    sd: sd(x),
    var: variance(x),
    min: min(x),
    q1: quantile(x, 0.25),
    q3: quantile(x, 0.75),
    max: max(x),
    IQR: iqr(x),
  };
}

export interface FreqRow {
  level: string;
  n: number;
  pct: number;
}

/** table() + prop.table(): counts in the given level order (or sorted like R). */
export function frequencies(values: readonly (string | number)[], levels?: readonly string[]): FreqRow[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
  const order =
    levels ??
    [...counts.keys()].sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a < b ? -1 : a > b ? 1 : 0;
    });
  return order.map((level) => {
    const n = counts.get(level) ?? 0;
    return { level, n, pct: (100 * n) / values.length };
  });
}

/** Tukey box-plot statistics with 1.5 * IQR fences. */
export function boxStats(x: readonly number[]) {
  const q1 = quantile(x, 0.25);
  const q3 = quantile(x, 0.75);
  const fenceLo = q1 - 1.5 * (q3 - q1);
  const fenceHi = q3 + 1.5 * (q3 - q1);
  const inside = x.filter((v) => v >= fenceLo && v <= fenceHi);
  return {
    q1,
    median: median(x),
    q3,
    mean: mean(x),
    fenceLo,
    fenceHi,
    whiskerLo: min(inside),
    whiskerHi: max(inside),
    outliers: x.filter((v) => v < fenceLo || v > fenceHi),
  };
}

export function zScores(x: readonly number[]): number[] {
  const m = mean(x);
  const s = sd(x);
  return x.map((v) => (v - m) / s);
}

export function minMax(x: readonly number[]): number[] {
  const lo = min(x);
  const hi = max(x);
  return x.map((v) => (v - lo) / (hi - lo));
}

/** Moment coefficient of skewness, g1 = m3 / m2^1.5 (e1071::skewness type 1). */
export function skewness(x: readonly number[]): number {
  const m = mean(x);
  let m2 = 0;
  let m3 = 0;
  for (const v of x) {
    m2 += (v - m) ** 2;
    m3 += (v - m) ** 3;
  }
  m2 /= x.length;
  m3 /= x.length;
  return m3 / m2 ** 1.5;
}
`;export{n as d};
