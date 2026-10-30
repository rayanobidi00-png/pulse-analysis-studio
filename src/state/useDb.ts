import { useEffect, useState } from 'react';
import type { Database } from 'sql.js';
import { getDb } from '../data/db';
import { csvText } from './analysis';

/** Lazily initialises sql.js and returns the database once ready. */
export function useDb(): { db: Database | null; error: string | null } {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getDb(csvText)
      .then((d) => live && setDb(d))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, []);
  return { db, error };
}
