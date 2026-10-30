import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect } from 'vitest';
import { computeAll } from '../src/analysis/compute';

export const root = resolve(__dirname, '..');
export const csv = readFileSync(resolve(root, 'data/student-por.csv'), 'utf8');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- results.json is untyped ground truth
export const R: any = JSON.parse(readFileSync(resolve(root, 'data/results.json'), 'utf8'));
export const A = computeAll(csv);

/** Statistics: absolute tolerance 1e-3. */
export function stat(actual: number, expected: number, tol = 1e-3) {
  expect(Math.abs(actual - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tol);
}

/** p-values: 1e-4 relative above 1e-10, same order of magnitude below. */
export function pval(actual: number, expected: number) {
  if (expected > 1e-10) {
    expect(Math.abs(actual - expected) / expected, `${actual} vs ${expected}`).toBeLessThanOrEqual(1e-4);
  } else if (expected === 0) {
    expect(actual).toBeLessThan(1e-6);
  } else {
    expect(Math.abs(Math.log10(actual) - Math.log10(expected)), `${actual} vs ${expected}`).toBeLessThan(1);
  }
}
