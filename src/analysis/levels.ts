// Ordered levels for categorical columns of students_clean (R factor order).
import { BAND_LABELS, FAIL_LABELS, MEDU_LABELS, STUDY_LABELS, type CleanStudent } from '../data/clean';
import { CATEGORICAL } from '../content/columns';

export const DERIVED_FACTORS = ['pass', 'grade_band', 'studytime_f', 'failures_f', 'Medu_f'] as const;
export const FACTOR_COLUMNS: string[] = [...CATEGORICAL, ...DERIVED_FACTORS];

const FIXED: Record<string, readonly string[]> = {
  pass: ['Fail', 'Pass'],
  grade_band: BAND_LABELS,
  studytime_f: STUDY_LABELS,
  failures_f: FAIL_LABELS,
  Medu_f: MEDU_LABELS,
  sex: ['Female', 'Male'],
  address: ['Urban', 'Rural'],
};

export function valuesOf(rows: readonly CleanStudent[], col: string): string[] {
  return rows.map((r) => String((r as unknown as Record<string, unknown>)[col]));
}

export function levelsOf(rows: readonly CleanStudent[], col: string): string[] {
  if (FIXED[col]) return [...FIXED[col]];
  const vals = [...new Set(valuesOf(rows, col))];
  return vals.every((v) => /^\d+$/.test(v)) ? vals.sort((a, b) => Number(a) - Number(b)) : vals.sort();
}

export function numericOf(rows: readonly CleanStudent[], col: string): number[] {
  return rows.map((r) => Number((r as unknown as Record<string, unknown>)[col]));
}
