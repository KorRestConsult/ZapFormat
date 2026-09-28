BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS supplier_state text NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS supplier_last_error text,
  ADD COLUMN IF NOT EXISTS supplier_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_synced_at timestamptz;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS supplier_order_number text,
  ADD COLUMN IF NOT EXISTS supplier_position_id text;

CREATE TABLE IF NOT EXISTS supplier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'supplier',
  supplier_order_number text NOT NULL,
  supplier_status text,
  supplier_status_code text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, provider, supplier_order_number)
);

CREATE INDEX IF NOT EXISTS supplier_orders_order_idx
  ON supplier_orders(order_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS supplier_orders_sync_idx
  ON supplier_orders(last_synced_at, updated_at);

COMMIT;
