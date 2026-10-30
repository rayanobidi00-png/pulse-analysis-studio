export interface SqlPreset {
  en: string;
  ar: string;
  sql: string;
}

export const SQL_PRESETS: SqlPreset[] = [
  {
    en: 'Pass rate by school', ar: 'نسبة النجاح حسب المدرسة',
    sql: `SELECT school, COUNT(*) AS n,
       ROUND(100.0 * SUM(pass = 'Pass') / COUNT(*), 1) AS pass_rate
FROM students_clean
GROUP BY school;`,
  },
  {
    en: 'Mean G3 by study time', ar: 'متوسط G3 حسب وقت الدراسة',
    sql: `SELECT studytime, studytime_f, COUNT(*) AS n, ROUND(AVG(G3), 2) AS mean_G3
FROM students_clean
GROUP BY studytime
ORDER BY studytime;`,
  },
  {
    en: 'Top 10 absentees', ar: 'أكثر 10 طلاب غيابًا',
    sql: `SELECT school, sex, age, absences, G1, G2, G3, pass
FROM students_clean
ORDER BY absences DESC
LIMIT 10;`,
  },
  {
    en: 'Pass rate by school and sex', ar: 'نسبة النجاح حسب المدرسة والجنس',
    sql: `SELECT school, sex, COUNT(*) AS n, ROUND(AVG(G3), 2) AS mean_G3,
       ROUND(100.0 * SUM(pass = 'Pass') / COUNT(*), 1) AS pass_rate
FROM students_clean
GROUP BY school, sex;`,
  },
  {
    en: 'Students with G3 = 0', ar: 'الطلاب الذين G3 = 0',
    sql: `SELECT school, sex, failures, absences, G1, G2, G3
FROM students_raw
WHERE G3 = 0
ORDER BY G2 DESC;`,
  },
  {
    en: "Mean G3 by mother's job", ar: 'متوسط G3 حسب عمل الأم',
    sql: `SELECT Mjob, COUNT(*) AS n, ROUND(AVG(G3), 2) AS mean_G3
FROM students_clean
GROUP BY Mjob
ORDER BY mean_G3 DESC;`,
  },
  {
    en: 'Students per grade band', ar: 'عدد الطلاب في كل فئة علامات',
    sql: `SELECT grade_band, COUNT(*) AS n
FROM students_clean
GROUP BY grade_band
ORDER BY MIN(G3);`,
  },
  {
    en: 'Alcohol index vs mean G3', ar: 'مؤشر الكحول مقابل متوسط G3',
    sql: `SELECT alcohol, COUNT(*) AS n, ROUND(AVG(G3), 2) AS mean_G3
FROM students_clean
GROUP BY alcohol
ORDER BY alcohol;`,
  },
  {
    en: 'Pass rate by past failures', ar: 'نسبة النجاح حسب الرسوب السابق',
    sql: `SELECT failures_f, COUNT(*) AS n,
       ROUND(100.0 * SUM(pass = 'Pass') / COUNT(*), 1) AS pass_rate
FROM students_clean
GROUP BY failures_f
ORDER BY failures_f;`,
  },
  {
    en: 'G2 vs G3 (all students)', ar: 'G2 مقابل G3 (جميع الطلاب)',
    sql: `SELECT G2, G3
FROM students_raw;`,
  },
];
