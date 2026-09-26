BEGIN;

CREATE TABLE IF NOT EXISTS saved_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand text NOT NULL,
  article text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_parts_user_part_unique
  ON saved_parts(user_id, upper(brand), upper(article));

CREATE INDEX IF NOT EXISTS saved_parts_user_created_idx
  ON saved_parts(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recent_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query text NOT NULL,
  query_key text NOT NULL,
  search_type text NOT NULL DEFAULT 'search',
  vehicle_context jsonb,
  use_count integer NOT NULL DEFAULT 1,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recent_searches_user_query_unique
  ON recent_searches(user_id, query_key);

CREATE INDEX IF NOT EXISTS recent_searches_user_last_idx
  ON recent_searches(user_id, last_used_at DESC);

COMMIT;
