// Empty default = same-origin relative requests (production single-project deploy).
// Local dev sets VITE_API_URL=http://localhost:8787 in apps/web/.env.local.
const BASE = import.meta.env.VITE_API_URL ?? '';

export type GetToken = () => Promise<string | null>;

/** Fetch wrapper that attaches the Clerk session token and parses JSON.
 *  Throws on non-2xx with the server error message when available. */
export async function apiFetch<T>(
  path: string,
  getToken: GetToken,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}
