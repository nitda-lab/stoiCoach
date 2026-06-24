# stoiCoach 🔥

理想の自分になるための生活をサポートするAIサービス。
AIとの対話で習慣・タスク・やめること・中長期目標を管理し、達成で「ストイックポイント」が貯まる。

## 設計ドキュメント
- 設計: [docs/superpowers/specs/2026-06-25-stoic-ai-life-app-design.md](docs/superpowers/specs/2026-06-25-stoic-ai-life-app-design.md)
- 実装計画: [docs/superpowers/plans/](docs/superpowers/plans/)

## 構成（モノレポ / Bun workspaces）
```
apps/
  api/   Hono + Neon(Postgres) + Clerk + nanoGPT   (REST API)
  web/   React + Vite + TS + Clerk + TanStack Query (SPA)
```

## 技術スタック
- **フロント**: React 18, Vite, TypeScript, React Router, TanStack Query, Clerk
- **API**: Hono (Bun), @neondatabase/serverless, @clerk/backend
- **DB**: Neon (serverless Postgres)
- **認証**: Clerk
- **LLM**: nanoGPT (OpenAI互換) — Plan 2 で実装

## セットアップ

前提: [Bun](https://bun.sh) 1.3+。

```bash
bun install
```

### 環境変数
APIは `apps/api/.env`、フロントは `apps/web/.env.local` に置く（どちらもgitignore済み）。
それぞれの `.env.example` をコピーして埋める。

`apps/api/.env`:
- `DATABASE_URL` — Neon接続文字列
- `CLERK_SECRET_KEY` — Clerk secret key (`sk_...`)
- `NANOGPT_API_KEY` — nanoGPT key (`sk-nano-...`)
- `NANOGPT_BASE_URL` (既定 `https://nano-gpt.com/api/v1`), `NANOGPT_MODEL`

`apps/web/.env.local`:
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (`pk_...`)
- `VITE_API_URL` — APIのURL（既定 `http://localhost:8787`）

### DBマイグレーション
```bash
bun run migrate          # apps/api/db/schema.sql を適用（冪等）
```

### 開発サーバー
```bash
bun run dev:api          # http://localhost:8787
bun run dev:web          # http://localhost:5173
```

## テスト・型チェック
```bash
bun run test             # APIのユニット/統合テスト（DBがあれば統合も走る）
bun run typecheck        # api + web の型チェック
```

ドメインロジック（項目検証・ポイント集計・ストリーク）はDB不要で動作。
リポジトリ層の統合テストは `DATABASE_URL` がある時のみ実行。

## 進捗
- [x] **Plan 1** 土台: モノレポ・API・Neonスキーマ・認証・Webスケルトン
- [x] **Plan 2** チャット + nanoGPTツール実行（create/update/complete/archive/list、`POST /api/chat`、チャットUI）
- [ ] **Plan 3** ダッシュボード + 期間別ポイント集計
- [ ] 将来: ランキング / 通知 / チャット履歴の永続化
