import { describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { COLUMNS, rClass } from '../src/content/columns';
import { buildClean, loadRaw } from '../src/data/db';
import { A, R, csv } from './helpers';

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

describe('sql.js tables', () => {
  it('students_raw and students_clean', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    loadRaw(db, csv);
    buildClean(db, csv);
    const n = db.exec('SELECT COUNT(*) FROM students_raw')[0].values[0][0];
    expect(n).toBe(649);
    const avg = db.exec('SELECT AVG(G3) FROM students_raw')[0].values[0][0] as number;
    expect(avg).toBeCloseTo(A.desc.find((d) => d.variable === 'G3')!.mean, 10);
    const cols = db.exec('SELECT * FROM students_clean LIMIT 1')[0].columns;
    expect(cols.length).toBe(43);
    const pass = db.exec("SELECT COUNT(*) FROM students_clean WHERE pass = 'Pass'")[0].values[0][0];
    expect(pass).toBe(R.pass_counts.Pass);
  });
});

describe('SQL cleaning pipeline', () => {
  it('builds the same students_clean as the TypeScript pipeline', async () => {
    const { FACTOR_SQL, FEATURE_SQL, ZSCORE_SQL, MINMAX_SQL } = await import('../src/data/cleanSql');
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    loadRaw(db, csv);
    for (const s of [FACTOR_SQL, FEATURE_SQL, ZSCORE_SQL, MINMAX_SQL]) db.exec(s);
    const res = db.exec('SELECT * FROM students_clean')[0];
    expect(res.columns).toEqual(Object.keys(A.clean[0]));
    res.values.forEach((row, i) => {
      res.columns.forEach((c, j) => {
        const ts = (A.clean[i] as unknown as Record<string, unknown>)[c];
        if (typeof ts === 'number') expect(Math.abs((row[j] as number) - ts)).toBeLessThan(1e-9);
        else expect(row[j]).toBe(ts);
      });
    });
  });
});
