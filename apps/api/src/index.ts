import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config';
import {
  requireAuth,
  defaultVerifyToken,
  type VerifyToken,
  type AppVariables,
} from './middleware/auth';
import { listItems } from './db/itemRepo';

export interface AppDeps {
  verifyToken?: VerifyToken;
  webOrigin?: string;
}

/** Build the Hono app. Dependencies are injectable for testing. */
export function createApp(deps: AppDeps = {}) {
  const verify = deps.verifyToken ?? defaultVerifyToken;
  const app = new Hono<{ Variables: AppVariables }>();

  app.use(
    '*',
    cors({
      origin: deps.webOrigin ?? safeWebOrigin(),
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.get('/health', (c) => c.json({ status: 'ok' }));

  const api = new Hono<{ Variables: AppVariables }>();
  api.use('*', requireAuth(verify));

  api.get('/items', async (c) => {
    const items = await listItems(c.get('userId'));
    return c.json({ items });
  });

  app.route('/api', api);
  return app;
}

function safeWebOrigin(): string {
  try {
    return config.webOrigin();
  } catch {
    return 'http://localhost:5173';
  }
}

// Entrypoint (only when run directly, not when imported by tests).
if (import.meta.main) {
  const app = createApp();
  const port = config.port();
  console.log(`stoiCoach API listening on http://localhost:${port}`);
  Bun.serve({ port, fetch: app.fetch });
}
