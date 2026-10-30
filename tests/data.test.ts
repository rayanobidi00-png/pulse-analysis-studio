import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { COLUMNS, rClass } from '../src/content/columns';
import { computeAll } from '../src/analysis/compute';
import { rowsToCsv } from '../src/data/backend';
import { COLUMN_NAMES, INTEGER_COLUMNS, parseCsv } from '../src/data/parse';
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

describe('Supabase backend', () => {
  it('rows from Postgres round-trip to the same CSV the analysis reads', () => {
    const parsed = parseCsv(csv);
    const back = parseCsv(rowsToCsv(parsed.rows));
    expect(back.header).toEqual(parsed.header);
    expect(back.rows).toEqual(parsed.rows);
    expect(computeAll(rowsToCsv(parsed.rows)).desc).toEqual(A.desc);
  });
  it('the migration creates every column with the right type', () => {
    const sql = readFileSync('supabase/migrations/20261030000000_pulse_schema.sql', 'utf8');
    for (const c of COLUMN_NAMES) {
      const type = (INTEGER_COLUMNS as readonly string[]).includes(c) ? 'smallint' : 'text';
      expect(sql).toContain(`"${c}" ${type} not null`);
    }
    expect(sql).toMatch(/enable row level security/);
  });
  it('the clean table has 43 columns', () => {
    expect(Object.keys(A.clean[0]).length).toBe(43);
    expect(A.clean.filter((s) => s.pass === 'Pass').length).toBe(R.pass_counts.Pass);
  });
});
