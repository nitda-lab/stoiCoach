import { handle } from 'hono/vercel';
import { createApp } from '../apps/api/src/index';

// Run on Vercel's Node.js runtime (default): @clerk/backend pulls in node:crypto,
// which the Edge runtime does not provide. Neon's serverless driver and the
// fetch-based nanoGPT calls work fine on Node.
export const config = { runtime: 'nodejs' };

const app = createApp();

export default handle(app);
