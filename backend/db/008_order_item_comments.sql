BEGIN;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS comment text;

COMMIT;
