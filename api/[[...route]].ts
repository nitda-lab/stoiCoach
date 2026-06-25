import { handle } from 'hono/vercel';
import { createApp } from '../apps/api/src/index';

// Run on Vercel's Edge runtime: Hono, the Neon serverless driver, @clerk/backend
// (Web Crypto) and fetch-based nanoGPT calls are all edge-compatible.
export const config = { runtime: 'edge' };

const app = createApp();

export default handle(app);
