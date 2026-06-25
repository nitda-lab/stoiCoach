import { createApp } from './index';
import { config } from './config';

// Local/Bun entrypoint. On Vercel the app is served via the edge function
// in /api/[[...route]].ts, which imports createApp() directly.
const app = createApp();
const port = config.port();
console.log(`stoiCoach API listening on http://localhost:${port}`);

Bun.serve({ port, fetch: app.fetch });
