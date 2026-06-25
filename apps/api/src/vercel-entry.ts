import { handle } from '@hono/node-server/vercel';
import { createApp } from './index';

// Bundled by scripts/build-fn.mjs into api/app.mjs (a single self-contained
// ESM file). Uses the Node-runtime adapter (Vercel passes Node req/res here,
// not a Web Request), so @clerk/backend's node:crypto works.
export default handle(createApp());
