// npm run verify: checks the data contract and that no statistic is typed by hand in the UI code.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { computeAll } from '../src/analysis/compute';

const root = resolve(import.meta.dirname, '..');
const csv = readFileSync(join(root, 'data/student-por.csv'), 'utf8');
const R = JSON.parse(readFileSync(join(root, 'data/results.json'), 'utf8'));
const A = computeAll(csv);
const failures: string[] = [];

function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(label);
}

const meanG3 = A.desc.find((d) => d.variable === 'G3')!.mean;
check('649 rows', A.n_rows === 649, String(A.n_rows));
check('33 columns', A.n_cols === 33, String(A.n_cols));
check('0 missing values', A.total_na === 0, String(A.total_na));
check('mean G3 = 11.906', Math.abs(meanG3 - 11.906) < 5e-4, meanG3.toFixed(4));
check('clean table has 43 columns', Object.keys(A.clean[0]).length === 43);
check('pass/fail = 549/100', A.pass_counts.Pass === R.pass_counts.Pass && A.pass_counts.Fail === R.pass_counts.Fail);
check('r(G2, G3) matches R', Math.abs(A.r_G2G3 - R.cor_test_G2G3.r) < 1e-3, A.r_G2G3.toFixed(4));
check('one-sample t matches R', Math.abs(A.t_one.statistic - R.t_one.statistic) < 1e-3);
check('multiple lm R² matches R', Math.abs(A.lm_multi.r2 - R.lm_multi.r2) < 1e-3);
check('logistic AIC matches R', Math.abs(A.logit.aic - R.logit.aic) < 1e-3);

// No hand-typed statistics in UI code: these values must only ever come from the stats engine.
const forbidden = [
  '11.906', '11.91', '84.6', '84.59', '0.919', '0.9185', '15.03', '7.093', '3.275', '9.159', '6.754', '62.25',
  '57.33', '3.971', '15.876', '76.898', '10.764', '0.8437', '0.844', '0.3189', '0.319', '0.3082', '29.87',
  '0.8613', '86.1', '429.75', '1.0185', '0.2747', '3.231',
];
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|json)$/.test(f) ? [p] : [];
  });
}
const uiFiles = ['src/pages', 'src/components', 'src/i18n', 'src/content'].flatMap((d) => {
  try {
    return walk(join(root, d));
  } catch {
    return [];
  }
});
const hits: string[] = [];
for (const f of uiFiles) {
  const text = readFileSync(f, 'utf8');
  for (const v of forbidden) {
    const re = new RegExp(`(?<![\\d.])${v.replace('.', '\\.')}(?!\\d)`);
    if (re.test(text)) hits.push(`${f.replace(root + '/', '')}: ${v}`);
  }
}
check('no hard-coded statistics in UI code', hits.length === 0, hits.slice(0, 5).join('; '));

if (failures.length) {
  console.error(`\nverify failed: ${failures.length} check(s)`);
  process.exit(1);
}
console.log('\nverify passed');
