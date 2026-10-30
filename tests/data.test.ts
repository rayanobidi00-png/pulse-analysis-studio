import { describe, expect, it } from 'vitest';
import { COLUMNS, rClass } from '../src/content/columns';
import { A, R } from './helpers';

describe('column dictionary', () => {
  it('matches the R types table (class and statistical type)', () => {
    expect(COLUMNS.map((c) => c.name)).toEqual(R.types.map((t: { column: string }) => t.column));
    for (const t of R.types) {
      const c = COLUMNS.find((x) => x.name === t.column)!;
      expect(c.statType).toBe(t.stat_type);
      expect(rClass(c.name)).toBe(t.r_class);
    }
  });
  it('has 17 nominal, 10 ordinal and 6 numeric columns', () => {
    const count = (k: string) => COLUMNS.filter((c) => c.kind === k).length;
    expect([count('nominal'), count('ordinal'), count('numeric')]).toEqual([17, 10, 6]);
  });
});

describe('clean table', () => {
  it('has 43 columns and the R pass count', () => {
    expect(Object.keys(A.clean[0]).length).toBe(43);
    expect(A.clean.filter((s) => s.pass === 'Pass').length).toBe(R.pass_counts.Pass);
  });
});
