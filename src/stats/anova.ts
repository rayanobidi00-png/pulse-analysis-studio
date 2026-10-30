// One-way ANOVA (aov) and Tukey HSD (TukeyHSD) for a numeric response and one factor.
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
        pair: `${gj.level}-${gi.level}`,
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
