// Linear (lm) and logistic (glm binomial, IRLS) regression with R-style summaries.
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
