import { describe as group, expect, it } from 'vitest';
import { A, R, pval, stat } from './helpers';

group('data description', () => {
  it('shape, NA, duplicates, zero grades, outliers', () => {
    expect(A.n_rows).toBe(R.n_rows);
    expect(A.n_cols).toBe(R.n_cols);
    expect(A.total_na).toBe(R.total_na);
    expect(A.duplicates).toBe(R.duplicates);
    expect(A.zero_g3).toBe(R.zero_g3);
    expect(A.absences_upper_fence).toBe(R.absences_upper_fence);
    expect(A.absences_outliers).toBe(R.absences_outliers);
    expect(A.absences_q1).toBe(0);
    expect(A.absences_q3).toBe(6);
  });
  it('clean table has 43 columns', () => {
    expect(Object.keys(A.clean[0]).length).toBe(43);
  });
});

group('descriptive statistics', () => {
  for (const row of R.desc) {
    it(`describe(${row.variable})`, () => {
      const mine = A.desc.find((d) => d.variable === row.variable)!;
      for (const k of ['mean', 'median', 'mode', 'sd', 'var', 'min', 'q1', 'q3', 'max', 'IQR'] as const) {
        stat(mine[k], row[k]);
      }
    });
  }
  it('frequency tables', () => {
    for (const f of R.freq) {
      const mine = A.freq.find((m) => m.variable === f.variable && m.level === f.level)!;
      expect(mine, `${f.variable}=${f.level}`).toBeDefined();
      expect(mine.n).toBe(f.n);
      stat(mine.pct, f.pct, 0.005);
    }
  });
  it('pass counts and grade bands', () => {
    expect(A.pass_counts).toEqual(R.pass_counts);
    expect(A.grade_bands).toEqual(R.grade_bands);
  });
  it('group summaries', () => {
    const cmp = (mine: { level: string; n: number; mean_G3: number; pass_rate: number }[], ref: Record<string, number | string>[], key: string, withPass = true) => {
      for (const r of ref) {
        const m = mine.find((x) => x.level === String(r[key]))!;
        expect(m, String(r[key])).toBeDefined();
        expect(m.n).toBe(r.n);
        stat(m.mean_G3, r.mean_G3 as number, 0.005);
        if (withPass) stat(m.pass_rate, r.pass_rate as number, 0.05);
      }
    };
    cmp(A.by_study, R.by_study, 'studytime_f');
    cmp(A.by_fail, R.by_fail, 'failures_f');
    cmp(A.by_higher, R.by_higher, 'higher');
    cmp(A.by_mjob, R.by_mjob, 'Mjob', false);
    cmp(A.by_medu, R.by_medu, 'Medu_f', false);
    cmp(A.by_alc, R.by_alc, 'Dalc', false);
    expect(A.by_mjob.map((m) => m.level)).toEqual(R.by_mjob.map((m: { Mjob: string }) => m.Mjob));
    for (const r of R.by_school_sex) {
      const m = A.by_school_sex.find((x) => x.school === r.school && x.sex === r.sex)!;
      expect(m.n).toBe(r.n);
      stat(m.mean_G3, r.mean_G3, 0.005);
      stat(m.pass_rate, r.pass_rate, 0.05);
    }
  });
});

group('correlation', () => {
  it('matrix (R rounds to 3 dp)', () => {
    expect(A.cor_vars).toEqual(R.cor_vars);
    A.cor_mat.forEach((row, i) => row.forEach((v, j) => stat(v, R.cor_mat[i][j], 5e-4 + 1e-9)));
  });
  it('correlations with G3', () => {
    for (const c of A.cor_G3) stat(c.r, R.cor_G3[c.variable], 5e-4 + 1e-9);
  });
  it('spearman and cor.test', () => {
    stat(A.spearman_study, R.spearman_study);
    stat(A.cor_test_G2G3.r, R.cor_test_G2G3.r);
    pval(A.cor_test_G2G3.p, R.cor_test_G2G3.p);
    stat(A.cor_test_fail.r, R.cor_test_fail.r);
    pval(A.cor_test_fail.p, R.cor_test_fail.p);
  });
});

group('t-tests', () => {
  for (const key of ['t_one', 't_paired', 't_sex', 't_higher', 't_school'] as const) {
    it(key, () => {
      const m = A[key];
      const r = R[key];
      stat(m.statistic, r.statistic);
      stat(m.df, r.df);
      pval(m.p, r.p);
      stat(m.ci[0], r.ci[0]);
      stat(m.ci[1], r.ci[1]);
      const est = Array.isArray(m.estimate) ? m.estimate : [m.estimate];
      const rest = Array.isArray(r.estimate) ? r.estimate : [r.estimate];
      est.forEach((e, i) => stat(e, rest[i]));
    });
  }
});

group('chi-square', () => {
  for (const key of ['chi_higher', 'chi_school', 'chi_sex'] as const) {
    it(key, () => {
      stat(A[key].statistic, R[key].statistic);
      expect(A[key].df).toBe(R[key].df);
      pval(A[key].p, R[key].p);
      expect(A[key].observed).toEqual(R[key].observed);
    });
  }
  it('minimum expected count', () => stat(A.chi_higher.minExpected, R.chi_higher_min_expected));
});

group('ANOVA and Tukey', () => {
  for (const key of ['anova_study', 'anova_fail', 'anova_medu'] as const) {
    it(key, () => {
      stat(A[key].F, R[key].F);
      expect(A[key].df1).toBe(R[key].df1);
      expect(A[key].df2).toBe(R[key].df2);
      pval(A[key].p, R[key].p);
      stat(A[key].ss_between, R[key].ss_between);
      stat(A[key].ss_within, R[key].ss_within);
    });
  }
  for (const key of ['tukey_study', 'tukey_fail'] as const) {
    it(key, () => {
      R[key].forEach((r: Record<string, number | string>, i: number) => {
        const m = A[key][i];
        expect(m.pair).toBe(r.pair);
        stat(m.diff, r.diff as number);
        stat(m.lwr, r.lwr as number);
        stat(m.upr, r.upr as number);
        const p = r['p adj'] as number;
        if (p === 0) expect(m.padj).toBeLessThan(1e-6);
        else stat(m.padj, p, Math.max(1e-4, p * 1e-3));
      });
    });
  }
});

group('regression', () => {
  const coefs = (mine: { term: string; estimate: number; se: number; t: number; p: number }[], ref: Record<string, number | string>[]) => {
    ref.forEach((r, i) => {
      expect(mine[i].term).toBe(r.term);
      stat(mine[i].estimate, r.estimate as number);
      stat(mine[i].se, r.se as number);
      stat(mine[i].t, r.t as number);
      pval(mine[i].p, r.p as number);
    });
  };
  it('simple lm G3 ~ G2', () => {
    coefs(A.lm_simple.coef, R.lm_simple.coef);
    stat(A.lm_simple.r2, R.lm_simple.r2);
    stat(A.lm_simple.adj_r2, R.lm_simple.adj_r2);
    stat(A.lm_simple.sigma, R.lm_simple.sigma);
  });
  it('multiple lm', () => {
    coefs(A.lm_multi.coef, R.lm_multi.coef);
    stat(A.lm_multi.r2, R.lm_multi.r2);
    stat(A.lm_multi.adj_r2, R.lm_multi.adj_r2);
    stat(A.lm_multi.sigma, R.lm_multi.sigma);
    stat(A.lm_multi.F, R.lm_multi.F);
    pval(A.lm_multi.p_overall, R.lm_multi.p_overall);
  });
  it('logistic glm', () => {
    coefs(A.logit.coef, R.logit.coef);
    stat(A.logit.aic, R.logit.aic);
    stat(A.logit.lr_chi, R.logit.lr_chi);
    expect(A.logit.lr_df).toBe(R.logit.lr_df);
    pval(A.logit.lr_p, R.logit.lr_p);
    stat(A.logit_confusion.accuracy, R.logit.accuracy);
    expect(A.logit_confusion.matrix).toEqual(R.logit.confusion);
  });
});

import { COMPARE_ROWS, matches } from '../src/analysis/compare';

group('R vs TypeScript comparison panel', () => {
  it('every row matches', () => {
    for (const row of COMPARE_ROWS) expect(matches(row, row.r(R), row.ts(A)), row.label).toBe(true);
  });
});
