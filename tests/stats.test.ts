import { describe, expect, it } from 'vitest';
import { quantile, mode, median, rank, spearman, pearson, frequencies, boxStats, zScores, minMax, mean, sd } from '../src/stats';
import { pt2, pchisqUpper, pfUpper } from '../src/stats/dist';
import { chiSqTest } from '../src/stats/chisq';
import { roc, confusion } from '../src/stats/regression';
import { inverse } from '../src/stats/linalg';

describe('primitives', () => {
  it('type-7 quantiles', () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75);
    expect(quantile([1, 2, 3, 4], 0.75)).toBeCloseTo(3.25);
    expect(median([5, 1, 3])).toBe(3);
  });
  it('mode picks the smallest most-frequent value', () => {
    expect(mode([3, 1, 1, 3, 2])).toBe(1);
  });
  it('average ranks for ties', () => {
    expect(rank([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
  });
  it('correlations', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [1, 4, 9, 16])).toBeCloseTo(1);
  });
  it('frequencies', () => {
    expect(frequencies(['a', 'b', 'a'])).toEqual([
      { level: 'a', n: 2, pct: (200 / 3) },
      { level: 'b', n: 1, pct: 100 / 3 },
    ]);
  });
  it('box stats flag IQR outliers', () => {
    expect(boxStats([1, 2, 3, 4, 100]).outliers).toEqual([100]);
  });
  it('z-scores and min-max', () => {
    const z = zScores([1, 2, 3, 4]);
    expect(mean(z)).toBeCloseTo(0);
    expect(sd(z)).toBeCloseTo(1);
    expect(minMax([2, 4, 6])).toEqual([0, 0.5, 1]);
  });
  it('distribution tails', () => {
    expect(pt2(1.96, 1e6)).toBeCloseTo(0.05, 3);
    expect(pchisqUpper(3.841459, 1)).toBeCloseTo(0.05, 5);
    expect(pfUpper(1, 5, 5)).toBeCloseTo(0.5, 5);
  });
  it('chi-square of a balanced table is 0', () => {
    expect(chiSqTest([[10, 10], [10, 10]]).statistic).toBe(0);
  });
  it('matrix inverse', () => {
    const inv = inverse([[4, 7], [2, 6]]);
    expect(inv[0][0]).toBeCloseTo(0.6);
    expect(inv[1][1]).toBeCloseTo(0.4);
  });
  it('perfect classifier has AUC 1', () => {
    expect(roc([0.9, 0.8, 0.2, 0.1], [1, 1, 0, 0]).auc).toBe(1);
    expect(confusion([0.9, 0.2], [1, 0]).accuracy).toBe(1);
  });
});
