import { describe, expect, test } from 'bun:test';
import { createApp } from './index';

// Fake verifier: token 'good' => user 'user_test', anything else throws.
const fakeVerify = async (token: string): Promise<string> => {
  if (token === 'good') return 'user_test';
  throw new Error('invalid token');
};

const app = createApp({ verifyToken: fakeVerify });

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
