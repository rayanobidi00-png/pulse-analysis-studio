// Readable names for model terms.
export const TERM_LABELS: Record<string, { en: string; ar: string }> = {
  '(Intercept)': { en: 'Intercept', ar: 'الثابت' },
  failures: { en: 'Past failures', ar: 'الرسوب السابق' },
  higheryes: { en: 'Wants higher ed.', ar: 'يرغب في التعليم الجامعي' },
  studytime: { en: 'Study time', ar: 'وقت الدراسة' },
  'schoolMousinho da Silveira': { en: 'School = MS', ar: 'المدرسة = MS' },
  absences: { en: 'Absences', ar: 'الغياب' },
  Dalc: { en: 'Workday alcohol', ar: 'الكحول أيام الدراسة' },
  sexMale: { en: 'Male', ar: 'ذكر' },
  Medu: { en: "Mother's education", ar: 'تعليم الأم' },
  schoolsupyes: { en: 'School support', ar: 'دعم المدرسة' },
  internetyes: { en: 'Internet', ar: 'الإنترنت' },
  G2: { en: 'G2', ar: 'G2' },
};

export const PREDICTOR_LABELS: Record<string, { en: string; ar: string }> = {
  failures: TERM_LABELS.failures,
  higher: TERM_LABELS.higheryes,
  studytime: TERM_LABELS.studytime,
  school: TERM_LABELS['schoolMousinho da Silveira'],
  absences: TERM_LABELS.absences,
  Dalc: TERM_LABELS.Dalc,
  sex: TERM_LABELS.sexMale,
  Medu: TERM_LABELS.Medu,
  schoolsup: TERM_LABELS.schoolsupyes,
  internet: TERM_LABELS.internetyes,
};
