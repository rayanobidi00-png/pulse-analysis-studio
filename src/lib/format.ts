// Number formatting. Numbers always use Western digits (as in R output) in both languages.

export function fmt(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return '—';
  const v = Object.is(Math.round(x * 10 ** digits), -0) ? 0 : x;
  return v.toFixed(digits);
}

export function fmtInt(x: number): string {
  return Math.round(x).toLocaleString('en-US');
}

export function pct(x: number, digits = 1): string {
  return `${fmt(x * 100, digits)}%`;
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/** p-values: 4 decimals when >= 0.0001, otherwise "a × 10⁻ᵇ". */
export function fmtP(p: number): string {
  if (!Number.isFinite(p)) return '—';
  if (p >= 1e-4) return p.toFixed(4);
  if (p === 0) return '< 10⁻³⁰⁰';
  const e = Math.floor(Math.log10(p));
  const m = p / 10 ** e;
  return `${m.toFixed(2)} × 10${String(e).split('').map((c) => SUP[c]).join('')}`;
}

/** Plain-text scientific p for Markdown/R-like output. */
export function fmtPPlain(p: number): string {
  return p >= 1e-4 ? p.toFixed(4) : p.toExponential(2);
}

export function signed(x: number, digits = 2): string {
  return `${x >= 0 ? '+' : '−'}${fmt(Math.abs(x), digits)}`;
}
