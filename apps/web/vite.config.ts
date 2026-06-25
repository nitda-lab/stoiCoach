import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Emit to the repo-root /dist so Vercel (root project) finds the output
  // regardless of dashboard Output Directory defaults.
  build: { outDir: '../../dist', emptyOutDir: true },
});
