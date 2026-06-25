// @ts-nocheck — the handler is bundled into ./app.mjs at build time
// (scripts/build-fn.mjs). This thin file is what Vercel detects as the
// Node serverless function; app.mjs is self-contained, so there is no
// cross-package module resolution at runtime.
export const config = { runtime: 'nodejs' };

export { default } from './app.mjs';
