import { describe, expect, test } from 'bun:test';
import { createApp } from './index';

// Fake verifier: token 'good' => user 'user_test', anything else throws.
const fakeVerify = async (token: string): Promise<string> => {
  if (token === 'good') return 'user_test';
  throw new Error('invalid token');
};

const app = createApp({ verifyToken: fakeVerify });

const appWithChat = createApp({
  verifyToken: fakeVerify,
  runChat: async (userId, messages) => ({
    reply: `echo:${userId}:${messages.length}`,
    actions: [{ type: 'created' }],
    messages: [],
  }),
});

describe('api app', () => {
  test('GET /health is public and returns ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  test('GET /api/items without a token is 401', async () => {
    const res = await app.request('/api/items');
    expect(res.status).toBe(401);
  });

  test('GET /api/items with a bad token is 401', async () => {
    const res = await app.request('/api/items', {
      headers: { Authorization: 'Bearer nope' },
    });
    expect(res.status).toBe(401);
  });

  test('GET /api/summary without a token is 401', async () => {
    const res = await app.request('/api/summary');
    expect(res.status).toBe(401);
  });

  test.skipIf(!process.env.DATABASE_URL)(
    'GET /api/summary returns points + items for a valid user',
    async () => {
      const res = await app.request('/api/summary', {
        headers: { Authorization: 'Bearer good' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        points: { today: number; week: number; month: number; total: number };
        items: unknown[];
      };
      expect(typeof body.points.total).toBe('number');
      expect(Array.isArray(body.items)).toBe(true);
    },
  );

  test('POST /api/items/:id/complete without a token is 401', async () => {
    const res = await app.request('/api/items/abc/complete', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  test.skipIf(!process.env.DATABASE_URL)(
    'POST /api/items/:id/complete on a missing item is 404',
    async () => {
      const res = await app.request(
        '/api/items/00000000-0000-0000-0000-000000000000/complete',
        { method: 'POST', headers: { Authorization: 'Bearer good' } },
      );
      expect(res.status).toBe(404);
    },
  );

  test('POST /api/chat without a token is 401', async () => {
    const res = await appWithChat.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    expect(res.status).toBe(401);
  });

  test('POST /api/chat returns reply + actions from runChat', async () => {
    const res = await appWithChat.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer good' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { reply: string; actions: unknown[] };
    expect(body.reply).toBe('echo:user_test:1');
    expect(body.actions).toHaveLength(1);
  });

  test('POST /api/chat rejects a non-array messages body with 400', async () => {
    const res = await appWithChat.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer good' },
      body: JSON.stringify({ messages: 'nope' }),
    });
    expect(res.status).toBe(400);
  });

  test.skipIf(!process.env.DATABASE_URL)(
    'GET /api/items with a valid token returns an array',
    async () => {
      const res = await app.request('/api/items', {
        headers: { Authorization: 'Bearer good' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { items: unknown[] };
      expect(Array.isArray(body.items)).toBe(true);
    },
  );
});
