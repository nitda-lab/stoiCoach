import { neon } from '@neondatabase/serverless';
import { config } from '../config';

export type Sql = ReturnType<typeof neon>;

let cached: Sql | null = null;

/** Lazily create the Neon SQL client. Reused across requests. */
export function getSql(): Sql {
  if (!cached) {
    cached = neon(config.databaseUrl());
  }
  return cached;
}
