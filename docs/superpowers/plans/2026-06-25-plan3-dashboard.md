# Plan 3 — Dashboard + Point Aggregation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A dashboard that shows stoic points by period (today/week/month/total), renders each item per its tracking primitive, shows streaks, and lets the user manually check items off — keeping chat and dashboard in sync.

**Architecture:** Pure date-range helpers (week/month boundaries). Point totals computed in SQL (`SUM`) to avoid date-type pitfalls. Completion dates returned as `YYYY-MM-DD` text. A summary service composes per-item display state (completedToday, streak) reusing the tested `currentStreak`. `GET /api/summary` and `POST /api/items/:id/complete`. Dashboard UI with period tabs, per-type cards, optimistic manual check.

**Tech Stack:** existing API + Neon, React, TanStack Query.

## Global Constraints
- All `date` columns surfaced to JS as `YYYY-MM-DD` strings (cast `date::text`).
- Point totals via SQL `SUM`, never JS reduce over Date objects.
- Manual check reuses the same completion path as the AI tool (snapshot point_weight).
- Week starts Monday; month starts on the 1st; all ranges are inclusive and end at `today`.

---

### Task 1: Date-range helpers (pure, TDD)
**Files:** Create `apps/api/src/domain/ranges.ts`. Test: `ranges.test.ts`.
**Interfaces:** `weekStart(date): string` (Monday), `monthStart(date): string`, `periodRange(period, today): {from,to}` for `'today'|'week'|'month'|'total'`.
- [ ] Tests: Monday-start across a week; month start; total range spans min..today.
- [ ] FAIL → implement → PASS. Commit `feat(domain): period date ranges`.

### Task 2: date::text fix + summary repo
**Files:** Modify `apps/api/src/db/completionRepo.ts` (cast `date::text`, add `listCompletionRows(userId)` → `{item_id,date}[]`). Create `apps/api/src/db/summaryRepo.ts` (`sumPoints(userId,from,to)`). Test: `summaryRepo.test.ts` (DB-gated).
**Interfaces:** `sumPoints(userId, from, to): Promise<number>`; `listCompletionRows(userId): Promise<{item_id:string; date:string}[]>`.
- [ ] Tests (DB-gated): add completions, sum within range; rows return string dates.
- [ ] FAIL/SKIP → implement → PASS/SKIP. Commit `feat(db): summary sum + completion rows (date as text)`.

### Task 3: Summary service (TDD, DB-free)
**Files:** Create `apps/api/src/summary/summaryService.ts`. Test: `summaryService.test.ts`.
**Interfaces:** `buildSummary({items, completionRows, today}): DashboardSummary` where `DashboardSummary = { points:{today,week,month,total}, items: ItemView[] }` and `ItemView = item + {completedToday:boolean, streak:number, periodCount:number}`. Pure: takes data in, no DB. Points computed via `sumPoints`-style reduce over string dates + `periodRange`.
- [ ] Tests: completedToday true/false; streak from rows; per-period point totals.
- [ ] FAIL → implement (reuse `currentStreak`, `periodRange`, `sumPoints`) → PASS. Commit `feat(summary): build dashboard summary`.

### Task 4: API routes
**Files:** Modify `apps/api/src/index.ts`. Test: extend `index.test.ts`.
**Interfaces:** `GET /api/summary` → `DashboardSummary` (loads items + completion rows, calls `buildSummary` with server today). `POST /api/items/:id/complete` body optional `{date}` → records completion (snapshot weight), 404 if item missing.
- [ ] Tests: 401 without token; DB-gated happy paths.
- [ ] Implement → PASS. Commit `feat(api): summary + manual complete routes`.

### Task 5: Dashboard UI
**Files:** Rewrite `apps/web/src/routes/DashboardPage.tsx`; add `apps/web/src/lib/useSummary.ts`, `apps/web/src/components/ItemCard.tsx`.
**Interfaces:** `useSummary()` query (`['summary']`); `useComplete()` mutation (optimistic; invalidates `['summary']`,`['items']`). `ItemCard` renders per `tracking_type`: recurring→checkbox+🔥streak; avoidance→days counter+check; one_time→due date+check; progress→percent bar. Period tabs switch the displayed point total.
- [ ] Implement; typecheck + build. Commit `feat(web): dashboard with per-type cards + manual check`.

---

## Self-Review
- Coverage: aggregation by period (T1/T3), date-type fix (T2), streaks (T3), endpoints (T4), per-primitive cards + manual check + sync (T5). ✓
- Placeholders: none. ✓
- Type consistency: `periodRange`/`DashboardSummary`/`ItemView`/`buildSummary`/`sumPoints` consistent across T1→T5; `ItemView` mirrors web `types.ts` Item plus derived fields. ✓
