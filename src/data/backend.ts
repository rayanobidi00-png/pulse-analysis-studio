// Data backend, Faisal Garage style: Supabase (Postgres + Row Level Security) when the project
// keys are set at build time, otherwise the CSV that ships with the site. Either way the same
// 649 rows reach the analysis, so every number on the site is identical.
import type { SupabaseClient } from '@supabase/supabase-js';
import bundledCsv from '../../data/student-por.csv?raw';
import { COLUMN_NAMES, parseCsv } from './parse';

export type Source = 'supabase' | 'local';

export interface Dataset {
  csv: string;
  source: Source;
  /** Why we fell back to the bundled file, when Supabase was configured but failed. */
  note?: string;
  ms: number;
}

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(URL_ && KEY);

let client: Promise<SupabaseClient> | null = null;

/** supabase-js is only downloaded when the project is configured. */
export function getClient(): Promise<SupabaseClient> | null {
  if (!supabaseConfigured) return null;
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_ as string, KEY as string, { auth: { persistSession: false } }),
  );
  return client;
}

/** Rows from Postgres back to the semicolon CSV that read.csv() and our parser expect. */
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  const cell = (v: unknown) => (v === null || v === undefined ? 'NA' : String(v));
  const lines = rows.map((r) => COLUMN_NAMES.map((c) => cell(r[c])).join(';'));
  return [COLUMN_NAMES.join(';'), ...lines].join('\n');
}

async function fromSupabase(): Promise<string> {
  const c = await getClient()!;
  const { data, error } = await c.from('students').select(COLUMN_NAMES.map((n) => `"${n}"`).join(',')).order('id').range(0, 999);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (rows.length !== parseCsv(bundledCsv).rows.length) throw new Error(`expected 649 rows, got ${rows.length}`);
  return rowsToCsv(rows);
}

let current: Dataset = { csv: bundledCsv, source: 'local', ms: 0 };

export async function loadDataset(): Promise<Dataset> {
  const t0 = performance.now();
  if (supabaseConfigured) {
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Supabase did not answer within 6 s')), 6000));
      const csv = await Promise.race([fromSupabase(), timeout]);
      current = { csv, source: 'supabase', ms: Math.round(performance.now() - t0) };
      return current;
    } catch (e) {
      current = { csv: bundledCsv, source: 'local', note: e instanceof Error ? e.message : String(e), ms: 0 };
      return current;
    }
  }
  return current;
}

export function dataset(): Dataset {
  return current;
}

/** Saves an Ask PULSE request to the shared log (insert-only for visitors). Silent when offline. */
export async function logRequest(text: string, intent: string): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await (await c).from('analysis_requests').insert({ request: text.slice(0, 300), intent });
  } catch {
    /* the log is optional; the answer has already been shown */
  }
}

export interface LoggedRequest {
  request: string;
  intent: string;
  created_at: string;
}

export async function recentRequests(limit = 8): Promise<LoggedRequest[]> {
  const c = getClient();
  if (!c) return [];
  const { data } = await (await c).from('analysis_requests').select('request,intent,created_at').order('created_at', { ascending: false }).limit(limit);
  return (data ?? []) as LoggedRequest[];
}
