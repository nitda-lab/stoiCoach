# Plan 2 — Chat + nanoGPT Tool Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let users talk to the AI in the chat screen; the AI calls tools (create/update/complete/archive/list items) that mutate the user's data via nanoGPT function calling, and the chat reports what changed so the dashboard stays in sync.

**Architecture:** A thin nanoGPT client (OpenAI-compatible chat completions). A tool registry (JSON-schema definitions + an executor that maps tool calls to repos, scoped by userId, validating with `validateItemInput`). A chat orchestration loop that calls the LLM, executes any tool calls, feeds results back, and loops until a final text reply — collecting "actions" for the UI. A `POST /api/chat` route. Frontend chat wired to it, invalidating the items query on each turn. Chat history is client-side for this plan (server is stateless); message persistence is deferred.

**Tech Stack:** nanoGPT `openai/gpt-oss-120b`, Hono, existing repos, React, TanStack Query.

## Global Constraints
- Model: `openai/gpt-oss-120b` (confirmed tool-calling). Configurable via `NANOGPT_MODEL`.
- Tool calls validated with `validateItemInput` before DB writes; invalid args return an error result to the model, never a 500.
- Orchestration loop capped at 5 LLM round-trips to bound latency/cost.
- All tool execution scoped by `userId` from the auth middleware.

---

### Task 1: nanoGPT client
**Files:** Create `apps/api/src/llm/nanogpt.ts`, `apps/api/src/llm/messages.ts` (shared message types). Test: `apps/api/src/llm/nanogpt.test.ts`.
**Interfaces:**
- Produces: `type ChatMessage` ({role:'system'|'user'|'assistant'|'tool', content:string, tool_calls?, tool_call_id?, name?}); `type ToolDef`; `type AssistantReply` ({content:string, tool_calls: ToolCall[]}); `async function complete(messages, tools, opts?): Promise<AssistantReply>` posting to `${base}/chat/completions`.
- [ ] Test (mock global fetch): maps an OpenAI-shaped response into `AssistantReply`; sends Bearer auth + model.
- [ ] Run → FAIL. Implement. Run → PASS. Commit `feat(llm): nanoGPT chat client`.

### Task 2: Tool registry + executor
**Files:** Create `apps/api/src/llm/tools.ts`. Test: `apps/api/src/llm/tools.test.ts`.
**Interfaces:**
- Produces: `TOOL_DEFS: ToolDef[]`; `type ToolAction` ({type, item?}); `async function executeTool(userId, name, args, today): Promise<{result: unknown; action?: ToolAction}>`.
- Tools: `create_item`, `update_item`, `complete_item`, `archive_item`, `list_items`.
- `create_item` validates via `validateItemInput`; `complete_item` snapshots `point_weight` into the completion.
- [ ] Tests: invalid create args → `{result:{error:...}}` no throw (no DB); unknown tool → error. DB-gated: create then list reflects it; complete adds points.
- [ ] Run → FAIL. Implement. Run → PASS/SKIP. Commit `feat(llm): tool registry + executor`.

### Task 3: Chat orchestration service
**Files:** Create `apps/api/src/chat/chatService.ts`. Test: `apps/api/src/chat/chatService.test.ts`.
**Interfaces:**
- Produces: `async function runChat(userId, history, deps): Promise<{reply:string, actions: ToolAction[], messages: ChatMessage[]}>` where `deps = {complete, execute, today, maxRounds?}` (defaults wire real client/executor).
- Loop: prepend SYSTEM_PROMPT; call `complete`; while reply has tool_calls and under cap, execute each, append assistant+tool messages, call again; return final text + collected actions.
- [ ] Tests (inject fake complete + fake execute): single tool_call → executes once, returns action + final reply; no tool_call → returns text directly; respects maxRounds.
- [ ] Run → FAIL. Implement + `SYSTEM_PROMPT` (Japanese stoic coach: infer sensible defaults, propose point weights by difficulty, confirm concisely). Run → PASS. Commit `feat(chat): orchestration loop + system prompt`.

### Task 4: POST /api/chat route
**Files:** Modify `apps/api/src/index.ts`. Test: extend `apps/api/src/index.test.ts`.
**Interfaces:** `POST /api/chat` body `{messages: ChatMessage[]}` → `{reply, actions}`. Auth required.
- [ ] Test (inject fake verifier + a fake `runChat` via deps): posts messages, returns reply+actions; 401 without token.
- [ ] Implement: thread an optional `runChat` into `AppDeps`; route calls it with `c.get('userId')`. Run → PASS. Commit `feat(api): POST /api/chat`.

### Task 5: Frontend chat wired to API
**Files:** Rewrite `apps/web/src/routes/ChatPage.tsx`; add `apps/web/src/lib/useChat.ts`.
**Interfaces:** `useChat()` holds message list, `send(text)` posts to `/api/chat`, appends reply, invalidates `['items']`; renders action chips (`✓ 朝ランを追加しました`).
- [ ] Implement; typecheck + build. Commit `feat(web): chat UI wired to AI`.

---

## Self-Review
- Coverage: nanoGPT (T1), tools/executor (T2), orchestration+system prompt (T3), endpoint (T4), chat UI + dashboard sync via query invalidation (T5). ✓
- Deferred (noted): chat history persistence to conversations/messages tables — not required for the core loop. ✓
- Type consistency: `ChatMessage`/`ToolDef`/`ToolAction`/`executeTool`/`runChat`/`complete` reused across T1→T5. ✓
