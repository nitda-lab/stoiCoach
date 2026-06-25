// @ts-nocheck — the handler is bundled into ./app.mjs at build time
// (scripts/build-fn.mjs). This thin file is what Vercel detects as the
// Node serverless function; app.mjs is self-contained, so there is no
// cross-package module resolution at runtime.
// maxDuration: the AI chat makes several nanoGPT round-trips per turn, which
// exceeds Vercel's default 10s. 60s is the Hobby-plan ceiling.
export const config = { runtime: 'nodejs', maxDuration: 60 };

export { default } from './app.mjs';
