// The 11 ggplot2 / corrplot images produced by pulse_analysis.R (section 6).
export interface GalleryItem {
  file: string;
  en: string;
  ar: string;
  w: number;
  h: number;
}

export const GALLERY: GalleryItem[] = [
  { file: '01_histogram_G3.png', en: 'Histogram: distribution of final grades (G3)', ar: 'مدرج تكراري: توزيع العلامات النهائية (G3)', w: 1600, h: 1000 },
  { file: '02_boxplot_studytime.png', en: 'Box plot: final grade by weekly study time', ar: 'مخطط صندوقي: العلامة النهائية حسب وقت الدراسة الأسبوعي', w: 1600, h: 1000 },
  { file: '03_boxplot_failures.png', en: 'Box plot: final grade by past class failures', ar: 'مخطط صندوقي: العلامة النهائية حسب الرسوب السابق', w: 1600, h: 1000 },
  { file: '04_bar_mjob.png', en: "Bar chart: average final grade by mother's job", ar: 'مخطط أعمدة: متوسط العلامة النهائية حسب عمل الأم', w: 1600, h: 1000 },
  { file: '05_bar_passrate_school_sex.png', en: 'Grouped bar chart: pass rate by school and sex', ar: 'مخطط أعمدة مجمّعة: نسبة النجاح حسب المدرسة والجنس', w: 1600, h: 1000 },
  { file: '06_pie_pass.png', en: 'Pie chart: pass vs fail', ar: 'مخطط دائري: النجاح مقابل الرسوب', w: 1200, h: 1200 },
  { file: '07_pie_reason.png', en: 'Pie chart: why students chose their school', ar: 'مخطط دائري: لماذا اختار الطلاب مدرستهم', w: 1400, h: 1200 },
  { file: '08_scatter_G2_G3.png', en: 'Scatter plot: G2 vs G3 with regression line', ar: 'مخطط انتشار: G2 مقابل G3 مع خط الانحدار', w: 1600, h: 1000 },
  { file: '09_scatter_absences.png', en: 'Scatter plot: absences vs final grade', ar: 'مخطط انتشار: الغياب مقابل العلامة النهائية', w: 1600, h: 1000 },
  { file: '10_corrplot.png', en: 'Correlation heat-map (corrplot)', ar: 'خريطة حرارية للارتباط (corrplot)', w: 1800, h: 1800 },
  { file: '11_bar_higher.png', en: 'Bar chart: pass rate by wanting higher education', ar: 'مخطط أعمدة: نسبة النجاح حسب الرغبة في التعليم الجامعي', w: 1600, h: 1000 },
];

export const plotUrl = (file: string) => `${import.meta.env.BASE_URL}plots/${file}`;
