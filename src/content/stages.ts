export interface Stage {
  path: string;
  en: string;
  ar: string;
  /** Pipeline stages are numbered 1-8; tools have no number. */
  step?: number;
}

export const STAGES: Stage[] = [
  { path: '/data', en: 'Data', ar: 'البيانات', step: 1 },
  { path: '/clean', en: 'Clean', ar: 'التنظيف', step: 2 },
  { path: '/describe', en: 'Describe', ar: 'الوصف', step: 3 },
  { path: '/test', en: 'Test', ar: 'الاختبارات', step: 4 },
  { path: '/model', en: 'Model', ar: 'النمذجة', step: 5 },
  { path: '/visualize', en: 'Visualize', ar: 'التصوير', step: 6 },
  { path: '/predict', en: 'Predict', ar: 'التنبؤ', step: 7 },
  { path: '/report', en: 'Report', ar: 'التقرير', step: 8 },
];

export const TOOLS: Stage[] = [
  { path: '/ask', en: 'Ask PULSE', ar: 'اسأل PULSE' },
  { path: '/r', en: 'Run it in R', ar: 'شغّله في R' },
  { path: '/about', en: 'About', ar: 'عن المشروع' },
];

export function nextStage(path: string): Stage | undefined {
  const i = STAGES.findIndex((s) => s.path === path);
  return i >= 0 ? STAGES[i + 1] : STAGES[0];
}
