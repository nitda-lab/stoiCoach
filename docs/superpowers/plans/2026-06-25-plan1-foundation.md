# Plan 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the monorepo, the Hono API server, the Neon Postgres schema + data-access layer, and Clerk authentication — a working, testable foundation the chat and dashboard build on.

**Architecture:** Bun-workspaces monorepo with `apps/api` (Hono) and `apps/web` (Vite/React/TS). The API talks to Neon Postgres through the serverless driver and a thin repository layer; pure domain logic (config validation, point/streak calc) is isolated for DB-free unit testing. Clerk guards both API routes (JWT verification) and the web app.

**Tech Stack:** Bun, TypeScript, Hono, @neondatabase/serverless, Clerk (@clerk/backend, @clerk/clerk-react), Vite, React, React Router, TanStack Query, Vitest.

## Global Constraints

- Runtime: Bun 1.3.x, Node 24 compatible. TypeScript strict mode on.
- Secrets (`NANOGPT_API_KEY`, `DATABASE_URL`, `CLERK_SECRET_KEY`) live only in `apps/api/.env` (gitignored). Frontend gets only `VITE_CLERK_PUBLISHABLE_KEY`.
- Never commit `.env`. Provide `.env.example` with placeholder values.
- Item `tracking_type` ∈ { `recurring`, `one_time`, `avoidance`, `progress` }.
- Points are never aggregated into a stored counter; they are summed from `completions.points_earned`.

---

### Task 1: Monorepo scaffold

**Files:**
- Create: `package.json` (root, workspaces), `.gitignore`, `tsconfig.base.json`
- Create: `apps/api/package.json`, `apps/web/package.json`

**Interfaces:**
- Produces: Bun workspaces `apps/*`; root scripts `dev`, `test`, `typecheck`.

- [ ] Root `package.json` with `"workspaces": ["apps/*"]`, `"private": true`, scripts.
- [ ] `.gitignore` includes `node_modules`, `dist`, `.env`, `*.local`.
- [ ] `tsconfig.base.json` with `strict: true`, `moduleResolution: bundler`, `target ES2022`.
- [ ] Run `bun install`. Expected: lockfile created, no errors.
- [ ] Commit: `chore: monorepo scaffold`.

### Task 2: Domain types + config validation (DB-free, TDD)

**Files:**
- Create: `apps/api/src/domain/item.ts` — types + `validateItemInput`
- Test: `apps/api/src/domain/item.test.ts`

**Interfaces:**
- Produces:
  - `type TrackingType = 'recurring' | 'one_time' | 'avoidance' | 'progress'`
  - `interface ItemInput { title: string; tracking_type: TrackingType; config: ItemConfig; point_weight: number }`
  - `type ItemConfig` = discriminated union per tracking_type (recurring: `{cadence,target_per_period}`, one_time: `{due_date}`, avoidance: `{since}`, progress: `{milestones,percent}`)
  - `function validateItemInput(raw: unknown): { ok: true; value: ItemInput } | { ok: false; error: string }`

- [ ] **Step 1: failing tests** — valid recurring passes; negative `point_weight` fails; unknown `tracking_type` fails; recurring missing `cadence` fails; progress `percent` out of 0–100 fails.
- [ ] **Step 2:** Run `bun test apps/api/src/domain/item.test.ts` → FAIL (not implemented).
- [ ] **Step 3:** Implement `validateItemInput` with per-type checks.
- [ ] **Step 4:** Run tests → PASS.
- [ ] **Step 5:** Commit `feat(domain): item types + validation`.

### Task 3: Points + streak calculation (DB-free, TDD)

**Files:**
- Create: `apps/api/src/domain/points.ts`
- Test: `apps/api/src/domain/points.test.ts`

**Interfaces:**
- Consumes: `Completion` shape `{ date: string; points_earned: number }`.
- Produces:
  - `function sumPoints(completions, range: {from: string; to: string}): number`
  - `function totalPoints(completions): number`
  - `function currentStreak(completionDates: string[], today: string): number`

- [ ] **Step 1: failing tests** — sum within range excludes out-of-range; total sums all; streak counts consecutive days back from today, breaks on gap.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement using date string comparison (YYYY-MM-DD lexicographic) and a day-set for streak.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(domain): point sum + streak calc`.

### Task 4: Database schema + migration runner

**Files:**
- Create: `apps/api/db/schema.sql` (users mirror via clerk_user_id, items, completions, conversations, messages)
- Create: `apps/api/src/db/client.ts` (neon pool from `DATABASE_URL`)
- Create: `apps/api/src/db/migrate.ts` (apply `schema.sql`)
- Create: `apps/api/.env.example`

**Interfaces:**
- Produces: `getSql()` returning a neon tagged-template client; `migrate()` applying schema idempotently (`CREATE TABLE IF NOT EXISTS`).

- [ ] `schema.sql`: `items` (id uuid pk, clerk_user_id text, title, tracking_type text, config jsonb, point_weight int, status text default 'active', created_at timestamptz default now()); `completions` (id, item_id fk, clerk_user_id, date date, points_earned int, created_at); `conversations`, `messages`. Indexes on `(clerk_user_id)` and `completions(clerk_user_id, date)`.
- [ ] `client.ts` reads `DATABASE_URL`, throws clear error if missing.
- [ ] `migrate.ts` runnable via `bun run apps/api/src/db/migrate.ts`.
- [ ] `.env.example` with `DATABASE_URL=`, `CLERK_SECRET_KEY=`, `NANOGPT_API_KEY=`, `NANOGPT_BASE_URL=https://nano-gpt.com/api/v1`, `NANOGPT_MODEL=`.
- [ ] Commit `feat(db): schema + migration runner`.

### Task 5: Repository layer (item + completion)

**Files:**
- Create: `apps/api/src/db/itemRepo.ts`, `apps/api/src/db/completionRepo.ts`
- Test: `apps/api/src/db/itemRepo.test.ts` (integration, gated on `DATABASE_URL`; skipped if unset)

**Interfaces:**
- Produces:
  - `createItem(userId, input: ItemInput): Promise<Item>`
  - `updateItem(userId, id, patch): Promise<Item>`
  - `listItems(userId, {status?}): Promise<Item[]>`
  - `archiveItem(userId, id): Promise<void>`
  - `addCompletion(userId, itemId, date, points): Promise<Completion>`
  - `listCompletions(userId, {from?, to?}): Promise<Completion[]>`

- [ ] **Step 1: failing tests** guarded by `describe.skipIf(!process.env.DATABASE_URL)` — create then list returns it; archive sets status.
- [ ] **Step 2:** Run → tests skip (no DB) or fail (with DB).
- [ ] **Step 3:** Implement repos with parameterized neon queries (all scoped by `clerk_user_id`).
- [ ] **Step 4:** Run → PASS/SKIP.
- [ ] **Step 5:** Commit `feat(db): item + completion repositories`.

### Task 6: Hono API + Clerk auth middleware + health

**Files:**
- Create: `apps/api/src/index.ts` (Hono app, CORS, routes), `apps/api/src/middleware/auth.ts`
- Test: `apps/api/src/index.test.ts`

**Interfaces:**
- Produces: `app` (Hono) with `GET /health` (public) and `requireAuth` middleware setting `c.set('userId', clerkUserId)` from a verified Clerk JWT (`Authorization: Bearer`). `GET /api/items` returns the user's items.

- [ ] **Step 1: failing test** — `GET /health` returns `{status:'ok'}`; `GET /api/items` without token returns 401.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement app + `requireAuth` using `@clerk/backend` `verifyToken` (skip network in test by injecting a verifier). Wire `GET /api/items` to `listItems`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): hono app + clerk auth + health`.

### Task 7: Web app scaffold + routing + Clerk + nav

**Files:**
- Create: `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/routes/ChatPage.tsx`, `apps/web/src/routes/DashboardPage.tsx`, `apps/web/src/components/TopNav.tsx`, `apps/web/.env.example`

**Interfaces:**
- Produces: React app wrapped in `ClerkProvider` + `QueryClientProvider`; React Router with `/` (chat) and `/dashboard`; top nav switching routes; signed-out users see Clerk `<SignIn/>`.

- [ ] Vite React-TS scaffold; install `@clerk/clerk-react`, `react-router-dom`, `@tanstack/react-query`.
- [ ] `main.tsx`: ClerkProvider(publishableKey from `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY`) → QueryClientProvider → RouterProvider.
- [ ] `TopNav`: links 💬 Chat / 📊 Dashboard / UserButton (all devices, top).
- [ ] Pages render placeholder content + signed-in guard.
- [ ] `bun run --cwd apps/web build` → succeeds.
- [ ] Commit `feat(web): scaffold + routing + clerk + top nav`.

### Task 8: API client + typecheck + README

**Files:**
- Create: `apps/web/src/lib/api.ts` (fetch wrapper attaching Clerk token), `README.md`
- Modify: root `package.json` scripts (`dev`, `typecheck`, `test`)

**Interfaces:**
- Produces: `apiFetch(path, init, getToken)` that adds `Authorization` header and base URL from `VITE_API_URL`.

- [ ] `apiFetch` implemented; `useItems()` query hook calling `GET /api/items`.
- [ ] README: setup, env vars, how to run api + web, how to migrate.
- [ ] `bun run typecheck` across workspaces → passes.
- [ ] Commit `feat: web api client + docs`.

---

## Self-Review

- **Spec coverage:** data model (Task 4/5), auth (Task 6/7), two separate screens + top nav (Task 7), API foundation for chat/dashboard (Task 6/8), points/streak logic (Task 3). Chat tools + nanoGPT = Plan 2. Aggregation UI = Plan 3. ✓
- **Placeholders:** none — each task has concrete files/interfaces. Full per-line code is filled in at execution under TDD. ✓
- **Type consistency:** `ItemInput`, `ItemConfig`, repo signatures, `requireAuth`/`userId` reused consistently across tasks 2→5→6→8. ✓
