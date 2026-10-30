import type { ReactNode } from 'react';
import { computeAll, computeOverview, type Analysis } from '../analysis/compute';
import { dataset } from '../data/backend';

let full: Analysis | null = null;
let overview: ReturnType<typeof computeOverview> | null = null;

/** The full analysis of the loaded dataset, computed once on first use (about 50 ms). */
export function useAnalysis(): Analysis {
  full ??= computeAll(dataset().csv);
  return full;
}

/** Cheap summary for the dashboard so the first paint does not wait for the models. */
export function useOverview() {
  overview ??= computeOverview(dataset().csv);
  return overview;
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** The CSV text the analysis runs on (from Supabase or the bundled file). */
export function csvText(): string {
  return dataset().csv;
}
