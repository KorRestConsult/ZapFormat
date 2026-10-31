BEGIN;

-- Supplier status is not proof of goods physically received in the garage.
-- Existing received_at values may have come from supplier synchronisation:
-- do not backfill received_quantity from them.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS received_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS physically_received_at timestamptz;
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_received_quantity_valid;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_received_quantity_valid
  CHECK (received_quantity >= 0 AND received_quantity <= quantity);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS packed_at timestamptz,
  ADD COLUMN IF NOT EXISTS packed_by uuid REFERENCES users(id);

CREATE TABLE IF NOT EXISTS order_item_intake_history (
  id bigserial PRIMARY KEY,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES users(id),
  previous_quantity integer NOT NULL CHECK (previous_quantity >= 0),
  received_quantity integer NOT NULL CHECK (received_quantity >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_item_intake_history_order_idx
  ON order_item_intake_history(order_id, created_at DESC);
COMMIT;
