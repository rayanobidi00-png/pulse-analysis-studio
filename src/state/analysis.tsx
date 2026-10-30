import type { ReactNode } from 'react';
import csvText from '../../data/student-por.csv?raw';
import { computeAll, computeOverview, type Analysis } from '../analysis/compute';

let full: Analysis | null = null;
let overview: ReturnType<typeof computeOverview> | null = null;

/** The full analysis of the bundled CSV, computed once on first use (about 50 ms). */
export function useAnalysis(): Analysis {
  full ??= computeAll(csvText);
  return full;
}

/** Cheap summary for the home page so the first paint does not wait for the models. */
export function useOverview() {
  overview ??= computeOverview(csvText);
  return overview;
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export { csvText };
