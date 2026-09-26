BEGIN;

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS manager_note text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

ALTER TABLE returns
  ADD COLUMN IF NOT EXISTS manager_note text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quote_requests_status_created_idx
  ON quote_requests(status, created_at ASC);

CREATE INDEX IF NOT EXISTS returns_status_created_idx
  ON returns(status, created_at ASC);

COMMIT;
