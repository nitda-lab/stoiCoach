import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { config } from '../config';

neonConfig.webSocketConstructor = WebSocket;

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', '..', 'db', 'schema.sql');

/** Apply db/schema.sql to the configured database. Idempotent.
 *  Uses a Pool (WebSocket) so the whole DDL script runs in one connection. */
export async function migrate(): Promise<void> {
  const pool = new Pool({ connectionString: config.databaseUrl() });
  try {
    const ddl = readFileSync(schemaPath, 'utf8');
    await pool.query(ddl);
  } finally {
    await pool.end();
  }
}

if (import.meta.main) {
  migrate()
    .then(() => {
      console.log('✓ migration applied');
      process.exit(0);
    })
    .catch((err) => {
      console.error('✗ migration failed:', err);
      process.exit(1);
    });
}
