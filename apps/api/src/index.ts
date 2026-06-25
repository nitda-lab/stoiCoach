import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config';
import {
  requireAuth,
  defaultVerifyToken,
  type VerifyToken,
  type AppVariables,
} from './middleware/auth';
import { listItems, getItem } from './db/itemRepo';
import { addCompletion, listCompletionRows } from './db/completionRepo';
import { buildSummary } from './summary/summaryService';
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

  api.get('/summary', async (c) => {
    const userId = c.get('userId');
    const [items, completionRows] = await Promise.all([
      listItems(userId),
      listCompletionRows(userId),
    ]);
    return c.json(buildSummary({ items, completionRows, today: todayStr() }));
  });

  api.post('/items/:id/complete', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const item = await getItem(userId, id);
    if (!item) return c.json({ error: 'item not found' }, 404);
    const body = (await c.req.json().catch(() => ({}))) as { date?: string };
    const date = body.date ?? todayStr();
    const completion = await addCompletion(userId, id, date, item.point_weight);
    return c.json({ completion });
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
