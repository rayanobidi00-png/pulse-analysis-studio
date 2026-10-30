// R code from pulse_analysis.R, split into the sections each page shows.
import script from '../../data/pulse_analysis.R?raw';

export const R_SCRIPT: string = script;

/** Lines between two markers (inclusive start, exclusive end). */
export function rBetween(start: string, end?: string): string {
  const i = script.indexOf(start);
  if (i < 0) return '';
  const j = end ? script.indexOf(end, i + start.length) : -1;
  return script.slice(i, j > i ? j : undefined).trimEnd();
}

export interface RSection {
  id: string;
  en: string;
  ar: string;
  code: string;
}

/** The script cut at its "# N) TITLE" banners, for the Run-it-in-R page. */
export function rSections(): RSection[] {
  const re = /^# =+\n# (\d)\) ([^\n]+)\n# =+\n/gm;
  const marks = [...script.matchAll(re)];
  const titlesAr: Record<string, string> = {
    '1': 'استيراد البيانات',
    '2': 'القيم المفقودة والتكرار وجودة البيانات',
    '3': 'المعالجة المسبقة وهندسة الخصائص',
    '4': 'الإحصاء الوصفي',
    '5': 'الإحصاء الاستدلالي',
    '6': 'تصوير البيانات (ggplot2)',
    '7': 'تصدير النتائج (JSON)',
  };
  const header = script.slice(0, marks[0]?.index ?? 0);
  return [
    { id: '0', en: 'Setup: libraries, theme and palette', ar: 'الإعداد: المكتبات والنمط والألوان', code: header.trim() },
    ...marks.map((m, k) => ({
      id: m[1],
      en: m[2].charAt(0) + m[2].slice(1).toLowerCase(),
      ar: titlesAr[m[1]] ?? m[2],
      code: script.slice(m.index, marks[k + 1]?.index ?? script.length).trim(),
    })),
  ];
}
