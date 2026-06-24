import type { Context, Next } from 'hono';
import { verifyToken as clerkVerifyToken } from '@clerk/backend';
import { config } from '../config';

/** Verifies a Clerk session JWT and resolves the Clerk user id (the `sub` claim). */
export type VerifyToken = (token: string) => Promise<string>;

export const defaultVerifyToken: VerifyToken = async (token: string) => {
  const claims = await clerkVerifyToken(token, { secretKey: config.clerkSecretKey() });
  if (!claims.sub) throw new Error('token has no subject');
  return claims.sub;
};

export type AppVariables = { userId: string };

/** Hono middleware factory. Rejects requests without a valid Bearer token. */
export function requireAuth(verify: VerifyToken) {
  return async (c: Context<{ Variables: AppVariables }>, next: Next) => {
    const header = c.req.header('Authorization') ?? '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return c.json({ error: 'missing bearer token' }, 401);
    }
    try {
      const userId = await verify(match[1]!);
      c.set('userId', userId);
    } catch {
      return c.json({ error: 'invalid token' }, 401);
    }
    await next();
  };
}
