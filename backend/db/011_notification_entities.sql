BEGIN;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text;

CREATE INDEX IF NOT EXISTS notifications_entity_idx
  ON notifications(user_id, entity_type, entity_id, created_at DESC)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

COMMIT;
