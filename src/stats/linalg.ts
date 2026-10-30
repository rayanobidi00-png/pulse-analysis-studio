// Small dense linear algebra for regression (p <= ~20).
export type Matrix = number[][];

export function transpose(a: Matrix): Matrix {
  return a[0].map((_, j) => a.map((r) => r[j]));
}

/** X'WX for design matrix X (n x p) and optional weights w. */
export function crossprod(x: Matrix, w?: readonly number[]): Matrix {
  const p = x[0].length;
  const out: Matrix = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let i = 0; i < x.length; i++) {
    const wi = w ? w[i] : 1;
    const r = x[i];
    for (let a = 0; a < p; a++) {
      const ra = r[a] * wi;
      for (let b = a; b < p; b++) out[a][b] += ra * r[b];
    }
  }
  for (let a = 0; a < p; a++) for (let b = 0; b < a; b++) out[a][b] = out[b][a];
  return out;
}

/** X'Wy. */
export function crossprodVec(x: Matrix, y: readonly number[], w?: readonly number[]): number[] {
  const p = x[0].length;
  const out = new Array<number>(p).fill(0);
  for (let i = 0; i < x.length; i++) {
    const wy = (w ? w[i] : 1) * y[i];
    for (let a = 0; a < p; a++) out[a] += x[i][a] * wy;
  }
  return out;
}

/** Inverse of a symmetric positive-definite matrix by Gauss-Jordan with partial pivoting. */
export function inverse(m: Matrix): Matrix {
  const n = m.length;
  const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
    if (Math.abs(a[piv][c]) < 1e-12) throw new Error('singular matrix');
    [a[c], a[piv]] = [a[piv], a[c]];
    const d = a[c][c];
    for (let j = 0; j < 2 * n; j++) a[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[c][j];
    }
  }
  return a.map((r) => r.slice(n));
}

export function matVec(m: Matrix, v: readonly number[]): number[] {
  return m.map((r) => r.reduce((s, x, j) => s + x * v[j], 0));
}

export function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
