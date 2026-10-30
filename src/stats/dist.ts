// Distribution functions. jStat supplies the special functions; upper tails are computed
// directly (not as 1 - cdf) so that tiny p-values such as 5.6e-263 keep their magnitude.
import jstat from 'jstat';

const { jStat } = jstat;

/** Two-sided p-value for a t statistic: P(|T| >= |t|). */
export function pt2(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0;
  return jStat.ibeta(df / (df + t * t), df / 2, 0.5);
}

/** Upper tail of F: P(F >= f). */
export function pfUpper(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;
  return jStat.ibeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2);
}

/** Quantile of Student's t. */
export function qt(p: number, df: number): number {
  return jStat.studentt.inv(p, df);
}

/** Two-sided normal p-value P(|Z| >= |z|). */
export function pnorm2(z: number): number {
  return jStat.erfc(Math.abs(z) / Math.SQRT2);
}

export function qnorm(p: number): number {
  return jStat.normal.inv(p, 0, 1);
}

/** Regularised upper incomplete gamma Q(a, x) (Numerical Recipes: series / continued fraction). */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  const gln = jStat.gammaln(a);
  if (x < a + 1) {
    let sum = 1 / a;
    let del = sum;
    let ap = a;
    for (let n = 0; n < 1000; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  const FPMIN = 1e-300;
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/** Upper tail of chi-square: P(X >= x). */
export function pchisqUpper(x: number, df: number): number {
  return gammaQ(df / 2, x / 2);
}

/** Studentized range distribution (R's ptukey / qtukey with one range). */
export function ptukey(q: number, nmeans: number, df: number): number {
  return jStat.tukey.cdf(q, nmeans, df);
}

export function qtukey(p: number, nmeans: number, df: number): number {
  return jStat.tukey.inv(p, nmeans, df);
}
