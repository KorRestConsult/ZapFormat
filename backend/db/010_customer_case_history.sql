BEGIN;

CREATE TABLE IF NOT EXISTS customer_case_history (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_type text NOT NULL CHECK (case_type IN ('quote','vin','return')),
  case_id text NOT NULL,
  status text NOT NULL,
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('customer','staff','system')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_case_history_case_idx
  ON customer_case_history(case_type, case_id, created_at);

CREATE INDEX IF NOT EXISTS customer_case_history_user_idx
  ON customer_case_history(user_id, created_at DESC);

COMMIT;
