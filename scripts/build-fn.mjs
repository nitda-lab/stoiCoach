import { build } from 'esbuild';

// Bundle the Hono app + all its dependencies into one self-contained ESM file
// that the Vercel Node function (api/[[...route]].ts) re-exports. Node built-ins
// (e.g. node:crypto used by @clerk/backend) stay external on the Node runtime.
await build({
  entryPoints: ['apps/api/src/vercel-entry.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'api/app.mjs',
  logLevel: 'info',
});

console.log('✓ bundled api/app.mjs');
