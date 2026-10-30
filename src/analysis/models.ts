// Model specifications shared by the Model and Predict stages (same formulas as pulse_analysis.R).
import type { CleanStudent } from '../data/clean';
import { fitLm, fitLogistic, type LinearModel, type LogisticModel } from '../stats/regression';

export type PredictorKey =
  | 'failures' | 'higher' | 'studytime' | 'school' | 'absences' | 'Dalc' | 'sex' | 'Medu' | 'schoolsup' | 'internet';

export interface Predictor {
  key: PredictorKey;
  /** R's coefficient name, e.g. "higheryes". */
  term: string;
  kind: 'numeric' | 'binary';
  /** Encoded value for one student (dummy = 1 for the non-reference level). */
  encode: (s: Pick<CleanStudent, PredictorKey>) => number;
  min?: number;
  max?: number;
}

export const PREDICTORS: Predictor[] = [
  { key: 'failures', term: 'failures', kind: 'numeric', encode: (s) => s.failures, min: 0, max: 3 },
  { key: 'higher', term: 'higheryes', kind: 'binary', encode: (s) => (s.higher === 'yes' ? 1 : 0) },
  { key: 'studytime', term: 'studytime', kind: 'numeric', encode: (s) => s.studytime, min: 1, max: 4 },
  {
    key: 'school', term: 'schoolMousinho da Silveira', kind: 'binary',
    encode: (s) => (s.school === 'Mousinho da Silveira' ? 1 : 0),
  },
  { key: 'absences', term: 'absences', kind: 'numeric', encode: (s) => s.absences, min: 0, max: 32 },
  { key: 'Dalc', term: 'Dalc', kind: 'numeric', encode: (s) => s.Dalc, min: 1, max: 5 },
  { key: 'sex', term: 'sexMale', kind: 'binary', encode: (s) => (s.sex === 'Male' ? 1 : 0) },
  { key: 'Medu', term: 'Medu', kind: 'numeric', encode: (s) => s.Medu, min: 0, max: 4 },
  { key: 'schoolsup', term: 'schoolsupyes', kind: 'binary', encode: (s) => (s.schoolsup === 'yes' ? 1 : 0) },
  { key: 'internet', term: 'internetyes', kind: 'binary', encode: (s) => (s.internet === 'yes' ? 1 : 0) },
];

export const MULTI_KEYS: PredictorKey[] = PREDICTORS.map((p) => p.key);
export const LOGIT_KEYS: PredictorKey[] = MULTI_KEYS.filter((k) => k !== 'schoolsup' && k !== 'internet');

export function designRow(s: Pick<CleanStudent, PredictorKey>, keys: readonly PredictorKey[]): number[] {
  return [1, ...keys.map((k) => PREDICTORS.find((p) => p.key === k)!.encode(s))];
}

export function termsFor(keys: readonly PredictorKey[]): string[] {
  return ['(Intercept)', ...keys.map((k) => PREDICTORS.find((p) => p.key === k)!.term)];
}

export function fitMulti(rows: CleanStudent[], keys: readonly PredictorKey[] = MULTI_KEYS): LinearModel {
  return fitLm(rows.map((s) => designRow(s, keys)), rows.map((s) => s.G3), termsFor(keys));
}

export function fitLogit(rows: CleanStudent[], keys: readonly PredictorKey[] = LOGIT_KEYS): LogisticModel {
  return fitLogistic(rows.map((s) => designRow(s, keys)), rows.map((s) => (s.pass === 'Pass' ? 1 : 0)), termsFor(keys));
}

export function fitSimple(rows: CleanStudent[]): LinearModel {
  return fitLm(rows.map((s) => [1, s.G2]), rows.map((s) => s.G3), ['(Intercept)', 'G2']);
}
