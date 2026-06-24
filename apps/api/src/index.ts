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
import { runChat as realRunChat, type RunChatResult } from './chat/chatService';
import type { ChatMessage } from './llm/messages';

export type RunChat = (
  userId: string,
  messages: ChatMessage[],
) => Promise<RunChatResult>;

export interface AppDeps {
  verifyToken?: VerifyToken;
  webOrigin?: string;
  runChat?: RunChat;
}

/** Today's date as YYYY-MM-DD in the server's local time. */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Build the Hono app. Dependencies are injectable for testing. */
export function createApp(deps: AppDeps = {}) {
  const verify = deps.verifyToken ?? defaultVerifyToken;
  const runChat: RunChat =
    deps.runChat ?? ((userId, messages) => realRunChat(userId, messages, { today: todayStr() }));
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

  api.post('/chat', async (c) => {
    const body = (await c.req.json().catch(() => null)) as
      | { messages?: unknown }
      | null;
    if (!body || !Array.isArray(body.messages)) {
      return c.json({ error: 'messages must be an array' }, 400);
    }
    const { reply, actions } = await runChat(
      c.get('userId'),
      body.messages as ChatMessage[],
    );
    return c.json({ reply, actions });
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
