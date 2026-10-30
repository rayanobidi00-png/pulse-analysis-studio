const e=`// Typed parser for the UCI student-por.csv file (semicolon separated, quoted strings).

export const COLUMN_NAMES = [
  'school', 'sex', 'age', 'address', 'famsize', 'Pstatus', 'Medu', 'Fedu', 'Mjob', 'Fjob', 'reason',
  'guardian', 'traveltime', 'studytime', 'failures', 'schoolsup', 'famsup', 'paid', 'activities',
  'nursery', 'higher', 'internet', 'romantic', 'famrel', 'freetime', 'goout', 'Dalc', 'Walc', 'health',
  'absences', 'G1', 'G2', 'G3',
] as const;

export type ColumnName = (typeof COLUMN_NAMES)[number];

/** Columns R reads as integer (read.csv converts the quoted "G1"/"G2" digits to integer too). */
export const INTEGER_COLUMNS = [
  'age', 'Medu', 'Fedu', 'traveltime', 'studytime', 'failures', 'famrel', 'freetime', 'goout', 'Dalc',
  'Walc', 'health', 'absences', 'G1', 'G2', 'G3',
] as const satisfies readonly ColumnName[];

export type IntColumn = (typeof INTEGER_COLUMNS)[number];
export type CharColumn = Exclude<ColumnName, IntColumn>;

export type Student = { [K in IntColumn]: number } & { [K in CharColumn]: string };

export type RawCell = string | number | null;

export interface ParsedCsv {
  header: string[];
  /** Cells as R would see them: integers for numeric columns, strings otherwise, null for NA. */
  rows: Record<string, RawCell>[];
}

const INT_SET = new Set<string>(INTEGER_COLUMNS);

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ';') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function toCell(column: string, value: string): RawCell {
  const v = value.trim();
  if (v === '' || v === 'NA') return null;
  if (INT_SET.has(column)) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return v;
}

/** Equivalent of read.csv(file, sep = ";", header = TRUE, stringsAsFactors = FALSE). */
export function parseCsv(text: string): ParsedCsv {
  const lines = text.replace(/\\r\\n?/g, '\\n').split('\\n').filter((l) => l.trim() !== '');
  const header = splitLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, RawCell> = {};
    header.forEach((h, i) => {
      row[h] = toCell(h, cells[i] ?? '');
    });
    return row;
  });
  return { header, rows };
}

/** Narrow parsed rows to fully typed students (the dataset has no NA). */
export function toStudents(parsed: ParsedCsv): Student[] {
  return parsed.rows.map((r) => {
    const s: Record<string, string | number> = {};
    for (const c of COLUMN_NAMES) {
      const v = r[c];
      s[c] = v === null || v === undefined ? (INT_SET.has(c) ? NaN : '') : v;
    }
    return s as Student;
  });
}

export function countNA(parsed: ParsedCsv): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of parsed.header) out[h] = parsed.rows.filter((r) => r[h] === null).length;
  return out;
}

export function countDuplicates(parsed: ParsedCsv): number {
  const seen = new Set<string>();
  let dup = 0;
  for (const r of parsed.rows) {
    const key = parsed.header.map((h) => String(r[h])).join('\\u0001');
    if (seen.has(key)) dup++;
    else seen.add(key);
  }
  return dup;
}
`;export{e as p};
