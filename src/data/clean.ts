// The preprocessing pipeline from pulse_analysis.R section 3, as pure functions.
import type { Student } from './parse';
import { mean, sd } from '../stats/descriptive';

export const STUDY_LABELS = ['<2 h', '2-5 h', '5-10 h', '>10 h'] as const;
export const FAIL_LABELS = ['0', '1', '2+'] as const;
export const MEDU_LABELS = ['None', 'Primary 4th', '5th-9th', 'Secondary', 'Higher'] as const;
export const BAND_LABELS = [
  'Fail (0-9)', 'Sufficient (10-11)', 'Good (12-13)', 'Very good (14-15)', 'Excellent (16-20)',
] as const;
export const SCHOOL_LABELS: Record<string, string> = { GP: 'Gabriel Pereira', MS: 'Mousinho da Silveira' };
export const SEX_LABELS: Record<string, string> = { F: 'Female', M: 'Male' };
export const ADDRESS_LABELS: Record<string, string> = { U: 'Urban', R: 'Rural' };

export interface CleanStudent extends Student {
  studytime_f: string;
  failures_f: string;
  Medu_f: string;
  pass: 'Pass' | 'Fail';
  grade_band: string;
  alcohol: number;
  avg_grade: number;
  z_G3: number;
  z_absences: number;
  norm_absences: number;
}

/** Text columns converted to factors in pulse_analysis.R (8 yes/no + 6 nominal). */
export const FACTOR_CONVERTED = [
  'schoolsup', 'famsup', 'paid', 'activities', 'nursery', 'higher', 'internet', 'romantic', 'school', 'sex', 'address',
  'Mjob', 'Fjob', 'reason',
] as const;

/** The ten new columns added on top of the 33 raw ones (43 in total). school, sex and address are relabelled in place. */
export const ADDED_COLUMNS = [
  'studytime_f', 'failures_f', 'Medu_f', 'pass', 'grade_band', 'alcohol',
  'avg_grade', 'z_G3', 'z_absences', 'norm_absences',
] as const;

export function gradeBand(g3: number): string {
  if (g3 <= 9) return BAND_LABELS[0];
  if (g3 <= 11) return BAND_LABELS[1];
  if (g3 <= 13) return BAND_LABELS[2];
  if (g3 <= 15) return BAND_LABELS[3];
  return BAND_LABELS[4];
}

export function failuresGroup(f: number): string {
  return f === 0 ? '0' : f === 1 ? '1' : '2+';
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export function cleanStudents(students: Student[]): CleanStudent[] {
  const g3 = students.map((s) => s.G3);
  const abs = students.map((s) => s.absences);
  const mG3 = mean(g3);
  const sG3 = sd(g3);
  const mA = mean(abs);
  const sA = sd(abs);
  const minA = Math.min(...abs);
  const maxA = Math.max(...abs);
  return students.map((s) => ({
    ...s,
    school: SCHOOL_LABELS[s.school] ?? s.school,
    sex: SEX_LABELS[s.sex] ?? s.sex,
    address: ADDRESS_LABELS[s.address] ?? s.address,
    studytime_f: STUDY_LABELS[s.studytime - 1],
    failures_f: failuresGroup(s.failures),
    Medu_f: MEDU_LABELS[s.Medu],
    pass: s.G3 >= 10 ? 'Pass' : 'Fail',
    grade_band: gradeBand(s.G3),
    alcohol: s.Dalc + s.Walc,
    avg_grade: round2((s.G1 + s.G2 + s.G3) / 3),
    z_G3: (s.G3 - mG3) / sG3,
    z_absences: (s.absences - mA) / sA,
    norm_absences: (s.absences - minA) / (maxA - minA),
  }));
}
