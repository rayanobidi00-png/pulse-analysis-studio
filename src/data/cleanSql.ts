// The cleaning pipeline as SQL that runs in sql.js. Steps 1-4 inspect students_raw;
// steps 5-8 build students_clean (43 columns), mirroring the dplyr mutate() in pulse_analysis.R.
import { COLUMN_NAMES } from './parse';

const yesNo = ['schoolsup', 'famsup', 'paid', 'activities', 'nursery', 'higher', 'internet', 'romantic'];

export const NA_CHECK_SQL = `SELECT ${COLUMN_NAMES.map((c) => `SUM("${c}" IS NULL) AS "${c}"`).join(',\n       ')}\nFROM students_raw;`;

export const DUPLICATES_SQL = `SELECT COUNT(*) AS duplicated_rows FROM (
  SELECT COUNT(*) AS n FROM students_raw
  GROUP BY ${COLUMN_NAMES.map((c) => `"${c}"`).join(', ')}
  HAVING n > 1
);`;

export const ZERO_G3_SQL = `SELECT school, sex, age, failures, absences, G1, G2, G3
FROM students_raw
WHERE G3 = 0
ORDER BY G2 DESC;`;

export const OUTLIER_SQL = `-- Q1 and Q3 come from the type-7 quantile in the stats engine (SQLite has no quantile());
-- the fence is Q3 + 1.5 * IQR.
SELECT COUNT(*) AS outliers, MAX(absences) AS max_absences
FROM students_raw
WHERE absences > :fence;`;

export const FACTOR_SQL = `DROP TABLE IF EXISTS students_clean;
CREATE TABLE students_clean AS SELECT * FROM students_raw;

-- nominal factors with readable labels (school, sex, address)
UPDATE students_clean SET
  school  = CASE school WHEN 'GP' THEN 'Gabriel Pereira' ELSE 'Mousinho da Silveira' END,
  sex     = CASE sex WHEN 'F' THEN 'Female' ELSE 'Male' END,
  address = CASE address WHEN 'U' THEN 'Urban' ELSE 'Rural' END;
-- ${yesNo.join(', ')} stay "no"/"yes" (levels no < yes); Mjob, Fjob, reason stay as text levels

-- ordered factors
ALTER TABLE students_clean ADD COLUMN studytime_f TEXT;
ALTER TABLE students_clean ADD COLUMN failures_f TEXT;
ALTER TABLE students_clean ADD COLUMN Medu_f TEXT;
UPDATE students_clean SET
  studytime_f = CASE studytime WHEN 1 THEN '<2 h' WHEN 2 THEN '2-5 h' WHEN 3 THEN '5-10 h' ELSE '>10 h' END,
  failures_f  = CASE WHEN failures = 0 THEN '0' WHEN failures = 1 THEN '1' ELSE '2+' END,
  Medu_f      = CASE Medu WHEN 0 THEN 'None' WHEN 1 THEN 'Primary 4th' WHEN 2 THEN '5th-9th'
                          WHEN 3 THEN 'Secondary' ELSE 'Higher' END;`;

export const FEATURE_SQL = `ALTER TABLE students_clean ADD COLUMN pass TEXT;
ALTER TABLE students_clean ADD COLUMN grade_band TEXT;
ALTER TABLE students_clean ADD COLUMN alcohol INTEGER;
ALTER TABLE students_clean ADD COLUMN avg_grade REAL;
UPDATE students_clean SET
  pass       = CASE WHEN G3 >= 10 THEN 'Pass' ELSE 'Fail' END,
  grade_band = CASE WHEN G3 <= 9  THEN 'Fail (0-9)'
                    WHEN G3 <= 11 THEN 'Sufficient (10-11)'
                    WHEN G3 <= 13 THEN 'Good (12-13)'
                    WHEN G3 <= 15 THEN 'Very good (14-15)'
                    ELSE 'Excellent (16-20)' END,
  alcohol    = Dalc + Walc,
  avg_grade  = ROUND((G1 + G2 + G3) / 3.0, 2);`;

export const ZSCORE_SQL = `ALTER TABLE students_clean ADD COLUMN z_G3 REAL;
ALTER TABLE students_clean ADD COLUMN z_absences REAL;
WITH s AS (
  SELECT AVG(G3) AS m3, AVG(absences) AS ma FROM students_raw
), v AS (
  SELECT m3, ma,
         SQRT(SUM((G3 - m3) * (G3 - m3)) / (COUNT(*) - 1)) AS s3,
         SQRT(SUM((absences - ma) * (absences - ma)) / (COUNT(*) - 1)) AS sa
  FROM students_raw, s
)
UPDATE students_clean SET
  z_G3       = (G3 - (SELECT m3 FROM v)) / (SELECT s3 FROM v),
  z_absences = (absences - (SELECT ma FROM v)) / (SELECT sa FROM v);`;

export const MINMAX_SQL = `ALTER TABLE students_clean ADD COLUMN norm_absences REAL;
UPDATE students_clean SET norm_absences =
  (absences - (SELECT MIN(absences) FROM students_raw)) * 1.0 /
  ((SELECT MAX(absences) FROM students_raw) - (SELECT MIN(absences) FROM students_raw));`;
