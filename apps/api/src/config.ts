/** Central env access. Throws clear errors when a required secret is missing. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to apps/api/.env (see .env.example).`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  databaseUrl: () => required('DATABASE_URL'),
  clerkSecretKey: () => required('CLERK_SECRET_KEY'),
  nanoGptApiKey: () => required('NANOGPT_API_KEY'),
  nanoGptBaseUrl: () => optional('NANOGPT_BASE_URL', 'https://nano-gpt.com/api/v1'),
  nanoGptModel: () => optional('NANOGPT_MODEL', 'claude-3-5-sonnet'),
  webOrigin: () => optional('WEB_ORIGIN', 'http://localhost:5173'),
  port: () => Number(optional('PORT', '8787')),
};
