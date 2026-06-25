import { handle } from 'hono/vercel';
import { createApp } from './index';

// Bundled by scripts/build-fn.mjs into api/app.mjs (a single self-contained
// ESM file) so Vercel's Node runtime needs no cross-package module resolution.
export default handle(createApp());
