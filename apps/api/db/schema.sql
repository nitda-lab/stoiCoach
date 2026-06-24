-- Stoic / stoiCoach schema. Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id  text        NOT NULL,
  title          text        NOT NULL,
  tracking_type  text        NOT NULL CHECK (tracking_type IN ('recurring','one_time','avoidance','progress')),
  config         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  point_weight   integer     NOT NULL DEFAULT 0 CHECK (point_weight >= 0),
  status         text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','done')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS items_user_idx ON items (clerk_user_id);

CREATE TABLE IF NOT EXISTS completions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        uuid        NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  clerk_user_id  text        NOT NULL,
  date           date        NOT NULL,
  points_earned  integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS completions_user_date_idx ON completions (clerk_user_id, date);
CREATE INDEX IF NOT EXISTS completions_item_idx ON completions (item_id);

CREATE TABLE IF NOT EXISTS conversations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id  text        NOT NULL,
  title          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_user_idx ON conversations (clerk_user_id);

CREATE TABLE IF NOT EXISTS messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  clerk_user_id    text        NOT NULL,
  role             text        NOT NULL CHECK (role IN ('user','assistant','tool')),
  content          text        NOT NULL DEFAULT '',
  tool_calls       jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);
