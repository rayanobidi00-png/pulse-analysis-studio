// The dataset: student-por.csv ships with the site, so it works offline in the lecture hall.
import bundledCsv from '../../data/student-por.csv?raw';

export interface Dataset {
  csv: string;
}

const current: Dataset = { csv: bundledCsv };

export function dataset(): Dataset {
  return current;
}
