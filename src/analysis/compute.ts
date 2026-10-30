// Runs the whole analysis of pulse_analysis.R on the parsed CSV. Every number on the site comes from here.
import { cleanStudents, FAIL_LABELS, MEDU_LABELS, STUDY_LABELS, BAND_LABELS, type CleanStudent } from '../data/clean';
import { countDuplicates, countNA, parseCsv, toStudents, type ParsedCsv, type Student } from '../data/parse';
import { anovaOneWay, groupBy, tukeyHSD } from '../stats/anova';
import { chiSqTest, crossTab } from '../stats/chisq';
import { corMatrix, corTest, pearson, spearman } from '../stats/correlation';
import { describe, frequencies, mean, quantile, iqr } from '../stats/descriptive';
import { confusion, roc } from '../stats/regression';
import { tTestOne, tTestPaired, tTestWelch } from '../stats/ttest';
import { fitLogit, fitMulti, fitSimple } from './models';

export const DESC_VARS = ['age', 'absences', 'failures', 'studytime', 'G1', 'G2', 'G3'] as const;
export const COR_VARS = [
  'G1', 'G2', 'G3', 'studytime', 'failures', 'absences', 'Medu', 'Fedu', 'Dalc', 'Walc', 'goout', 'freetime',
  'health', 'age', 'traveltime', 'famrel',
] as const;
export const FREQ_VARS = ['school', 'sex', 'address', 'higher', 'internet', 'romantic', 'Mjob', 'reason'] as const;

type NumKey = (typeof COR_VARS)[number];

export function col(rows: readonly Student[], key: NumKey | 'G3'): number[] {
  return rows.map((r) => r[key]);
}

function groupSummary(rows: CleanStudent[], key: keyof CleanStudent, levels: readonly string[]) {
  return levels
    .map((level) => {
      const g = rows.filter((r) => String(r[key]) === level);
      return {
        level,
        n: g.length,
        mean_G3: mean(g.map((r) => r.G3)),
        pass_rate: (100 * g.filter((r) => r.pass === 'Pass').length) / g.length,
      };
    })
    .filter((g) => g.n > 0);
}

export function computeAll(csvText: string) {
  const parsed: ParsedCsv = parseCsv(csvText);
  const raw = toStudents(parsed);
  const clean = cleanStudents(raw);
  const naPerCol = countNA(parsed);
  const G3 = col(raw, 'G3');
  const absences = col(raw, 'absences');
  const absQ1 = quantile(absences, 0.25);
  const absQ3 = quantile(absences, 0.75);
  const fence = absQ3 + 1.5 * iqr(absences);

  const desc = DESC_VARS.map((v) => ({ variable: v, ...describe(col(raw, v)) }));
  const freq = FREQ_VARS.flatMap((v) => {
    const levels = [...new Set(clean.map((r) => String(r[v])))].sort();
    return frequencies(clean.map((r) => String(r[v])), levels).map((f) => ({ variable: v, ...f }));
  });

  const corMat = corMatrix(COR_VARS.map((v) => col(raw, v)));
  const g3i = COR_VARS.indexOf('G3');
  const corG3 = COR_VARS.filter((v) => v !== 'G3')
    .map((v) => ({ variable: v, r: corMat[COR_VARS.indexOf(v)][g3i] }))
    .sort((a, b) => a.r - b.r);

  const by = (k: keyof CleanStudent) => (lvl: string) => clean.filter((r) => r[k] === lvl).map((r) => r.G3);
  const bySex = by('sex');
  const byHigher = by('higher');
  const bySchool = by('school');
  const passOf = clean.map((r) => r.pass);
  const chi = (k: 'higher' | 'school' | 'sex', levels: string[]) => {
    const t = crossTab(clean.map((r) => r[k]), passOf, levels, ['Fail', 'Pass']);
    return chiSqTest(t.observed, t.rowLevels, t.colLevels);
  };

  const anovaStudy = anovaOneWay(groupBy(G3, clean.map((r) => r.studytime_f), STUDY_LABELS));
  const anovaFail = anovaOneWay(groupBy(G3, clean.map((r) => r.failures_f), FAIL_LABELS));
  const anovaMedu = anovaOneWay(groupBy(G3, clean.map((r) => r.Medu_f), MEDU_LABELS));

  const lmSimple = fitSimple(clean);
  const lmMulti = fitMulti(clean);
  const logit = fitLogit(clean);
  const yPass = clean.map((r) => (r.pass === 'Pass' ? 1 : 0));
  const conf = confusion(logit.fitted, yPass, 0.5);
  const rocCurve = roc(logit.fitted, yPass);

  const passN = clean.filter((r) => r.pass === 'Pass').length;
  const mjobLevels = [...new Set(clean.map((r) => r.Mjob))].sort();

  return {
    parsed,
    raw,
    clean,
    n_rows: parsed.rows.length,
    n_cols: parsed.header.length,
    na_per_col: naPerCol,
    total_na: Object.values(naPerCol).reduce((a, b) => a + b, 0),
    duplicates: countDuplicates(parsed),
    zero_g3: G3.filter((g) => g === 0).length,
    absences_q1: absQ1,
    absences_q3: absQ3,
    absences_upper_fence: fence,
    absences_outliers: absences.filter((a) => a > fence).length,
    desc,
    freq,
    pass_counts: { Fail: clean.length - passN, Pass: passN },
    pass_rate: passN / clean.length,
    grade_bands: Object.fromEntries(
      frequencies(clean.map((r) => r.grade_band), BAND_LABELS).map((f) => [f.level, f.n]),
    ) as Record<string, number>,
    by_study: groupSummary(clean, 'studytime_f', STUDY_LABELS),
    by_fail: groupSummary(clean, 'failures_f', FAIL_LABELS),
    by_higher: groupSummary(clean, 'higher', ['no', 'yes']),
    by_mjob: groupSummary(clean, 'Mjob', mjobLevels).sort((a, b) => b.mean_G3 - a.mean_G3),
    by_school_sex: ['Gabriel Pereira', 'Mousinho da Silveira'].flatMap((school) =>
      ['Female', 'Male'].map((sex) => {
        const g = clean.filter((r) => r.school === school && r.sex === sex);
        return {
          school,
          sex,
          n: g.length,
          mean_G3: mean(g.map((r) => r.G3)),
          pass_rate: (100 * g.filter((r) => r.pass === 'Pass').length) / g.length,
        };
      }),
    ),
    by_medu: groupSummary(clean, 'Medu_f', MEDU_LABELS),
    by_alc: groupSummary(clean, 'Dalc', ['1', '2', '3', '4', '5']),
    cor_vars: [...COR_VARS],
    cor_mat: corMat,
    cor_G3: corG3,
    spearman_study: spearman(col(raw, 'studytime'), G3),
    r_G2G3: pearson(col(raw, 'G2'), G3),
    cor_test_G2G3: corTest(col(raw, 'G2'), G3),
    cor_test_fail: corTest(col(raw, 'failures'), G3),
    t_one: tTestOne(G3, 10),
    t_paired: tTestPaired(G3, col(raw, 'G1')),
    t_sex: tTestWelch(bySex('Female'), bySex('Male')),
    t_higher: tTestWelch(byHigher('no'), byHigher('yes')),
    t_school: tTestWelch(bySchool('Gabriel Pereira'), bySchool('Mousinho da Silveira')),
    chi_higher: chi('higher', ['no', 'yes']),
    chi_school: chi('school', ['Gabriel Pereira', 'Mousinho da Silveira']),
    chi_sex: chi('sex', ['Female', 'Male']),
    anova_study: anovaStudy,
    anova_fail: anovaFail,
    anova_medu: anovaMedu,
    tukey_study: tukeyHSD(anovaStudy),
    tukey_fail: tukeyHSD(anovaFail),
    lm_simple: lmSimple,
    lm_multi: lmMulti,
    logit,
    logit_confusion: conf,
    logit_roc: rocCurve,
  };
}

export type Analysis = ReturnType<typeof computeAll>;

/** The few numbers the home page needs, without running the full analysis. */
export function computeOverview(csvText: string) {
  const parsed = parseCsv(csvText);
  const raw = toStudents(parsed);
  const G3 = col(raw, 'G3');
  const pass = G3.filter((g) => g >= 10).length;
  return {
    n_rows: parsed.rows.length,
    n_cols: parsed.header.length,
    total_na: Object.values(countNA(parsed)).reduce((a, b) => a + b, 0),
    G3,
    meanG3: mean(G3),
    pass_counts: { Fail: G3.length - pass, Pass: pass },
    pass_rate: pass / G3.length,
    r_G2G3: pearson(col(raw, 'G2'), G3),
  };
}
