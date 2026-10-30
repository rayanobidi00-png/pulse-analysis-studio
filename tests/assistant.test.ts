import { describe, expect, it } from 'vitest';
import { answer, parseRequest } from '../src/assistant/engine';
import { A, R } from './helpers';

const ask = (q: string) => answer(A.raw, parseRequest(q));
const stat = (q: string, label: string) => ask(q).stats?.find((s) => s.label.en === label)?.value;

describe('Ask PULSE: understanding requests', () => {
  const cases: [string, string, string[]][] = [
    ['Clean the data', 'clean', []],
    ['نظّف البيانات', 'clean', []],
    ['في قيم ناقصة؟', 'missing', []],
    ['Outliers in absences', 'outliers', ['absences']],
    ['ارسم هيستوغرام للغياب', 'histogram', ['absences']],
    ['Box plot of final grade by study time', 'boxplot', ['G3', 'studytime']],
    ['رسم دائري لوظيفة الأم', 'pie', ['Mjob']],
    ['Scatter of G2 and G3', 'scatter', ['G2', 'G3']],
    ['Does sex affect the final grade?', 'compare', ['sex', 'G3']],
    ['قارن العلامة حسب المدرسة', 'compare', ['G3', 'school']],
    ['الارتباط بين الرسوب السابق والعلامة', 'correlation', ['failures', 'G3']],
    ['Pass rate by school', 'passrate', ['school']],
    ['How many girls failed?', 'count', []],
    ['Is the mean final grade higher than 10?', 'onesample', ['G3']],
    ['Did grades improve from G1 to G3?', 'paired', ['G3', 'G1']],
    ['Regression of G3 on G2 and failures', 'regression', ['G3', 'G2', 'failures']],
    ['Top 10 absences', 'top', ['absences']],
  ];
  it.each(cases)('%s', (q, intent, vars) => {
    const p = parseRequest(q);
    expect(p.intent).toBe(intent);
    for (const v of vars) expect(p.vars).toContain(v);
  });
  it('reads value words as filters', () => {
    expect(parseRequest('How many girls failed?').filters).toEqual([
      { col: 'sex', value: 'F' },
      { col: 'pass', value: 'fail' },
    ]);
    expect(parseRequest('كم بنت رسبت؟').filters.map((f) => f.col)).toContain('sex');
  });
});

describe('Ask PULSE: answers match R', () => {
  it('Welch t-test for sex', () => {
    expect(Number(stat('compare final grade by sex', 't'))).toBeCloseTo(R.t_sex.statistic, 2);
  });
  it('ANOVA for study time', () => {
    expect(Number(stat('compare G3 by study time', 'F'))).toBeCloseTo(R.anova_study.F, 2);
  });
  it('chi-square for higher education and passing', () => {
    expect(Number(stat('is higher education related to passing', 'χ²'))).toBeCloseTo(R.chi_higher.statistic, 2);
  });
  it('one-sample t-test against 10', () => {
    expect(Number(stat('is the mean final grade higher than 10', 't'))).toBeCloseTo(R.t_one.statistic, 2);
  });
  it('paired t-test G1 to G3', () => {
    expect(Number(stat('did grades improve from G1 to G3', 't'))).toBeCloseTo(R.t_paired.statistic, 2);
  });
  it('correlation G2 and G3', () => {
    expect(Number(stat('correlation between G2 and G3', 'r'))).toBeCloseTo(R.cor_test_G2G3.r, 3);
  });
  it('simple regression R²', () => {
    expect(Number(stat('regression of G3 on G2', 'R²'))).toBeCloseTo(R.lm_simple.r2, 3);
  });
  it('counts and cleaning', () => {
    expect(stat('how many students failed', 'Count')).toBe(String(R.pass_counts.Fail));
    expect(ask('clean the data').table?.rows[2][1]).toBe(String(R.zero_g3));
    expect(ask('outliers in absences').stats?.[2].value).toBe(String(R.absences_outliers));
  });
});
