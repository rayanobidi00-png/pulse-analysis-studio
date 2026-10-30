// SQLite in the browser (sql.js / WASM). students_raw holds the CSV as read.csv sees it;
// students_clean is created by the cleaning pipeline (43 columns).
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { cleanStudents } from './clean';
import { COLUMN_NAMES, INTEGER_COLUMNS, parseCsv, toStudents } from './parse';

let dbPromise: Promise<Database> | null = null;

const INT = new Set<string>(INTEGER_COLUMNS);

export function createRawTableSql(): string {
  const cols = COLUMN_NAMES.map((c) => `  "${c}" ${INT.has(c) ? 'INTEGER' : 'TEXT'}`).join(',\n');
  return `CREATE TABLE students_raw (\n${cols}\n);`;
}

export function loadRaw(db: Database, csv: string) {
  const parsed = parseCsv(csv);
  db.run('DROP TABLE IF EXISTS students_raw;');
  db.run(createRawTableSql());
  const stmt = db.prepare(
    `INSERT INTO students_raw VALUES (${COLUMN_NAMES.map(() => '?').join(',')})`,
  );
  db.run('BEGIN');
  for (const r of parsed.rows) stmt.run(COLUMN_NAMES.map((c) => r[c] as SqlValue));
  db.run('COMMIT');
  stmt.free();
}

/** Builds students_clean from the raw rows (the TypeScript pipeline mirrors the R mutate()). */
export function buildClean(db: Database, csv: string) {
  const clean = cleanStudents(toStudents(parseCsv(csv)));
  const cols = Object.keys(clean[0]);
  const typeOf = (v: unknown) => (typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT');
  const sample = clean[0] as unknown as Record<string, unknown>;
  db.run('DROP TABLE IF EXISTS students_clean;');
  db.run(
    `CREATE TABLE students_clean (${cols
      .map((c) => `"${c}" ${['z_G3', 'z_absences', 'norm_absences', 'avg_grade'].includes(c) ? 'REAL' : typeOf(sample[c])}`)
      .join(', ')});`,
  );
  const stmt = db.prepare(`INSERT INTO students_clean VALUES (${cols.map(() => '?').join(',')})`);
  db.run('BEGIN');
  for (const r of clean) stmt.run(cols.map((c) => (r as unknown as Record<string, SqlValue>)[c]));
  db.run('COMMIT');
  stmt.free();
}

export function getDb(csv: string): Promise<Database> {
  if (!dbPromise) {
    dbPromise = initSqlJs({ locateFile: () => wasmUrl }).then((SQL) => {
      const db = new SQL.Database();
      loadRaw(db, csv);
      buildClean(db, csv);
      return db;
    });
  }
  return dbPromise;
}

export interface QueryResult {
  columns: string[];
  values: SqlValue[][];
}

export function runQuery(db: Database, sql: string): QueryResult {
  const res = db.exec(sql);
  const last = res[res.length - 1];
  return last ? { columns: last.columns, values: last.values } : { columns: [], values: [] };
}
