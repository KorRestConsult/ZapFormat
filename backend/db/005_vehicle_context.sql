-- Preserve the selected garage vehicle as order/search context.
-- This is context only; it does not assert part compatibility.
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL;

ALTER TABLE quote_request_items
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cart_items_vehicle_idx
  ON cart_items(vehicle_id);

CREATE INDEX IF NOT EXISTS order_items_vehicle_idx
  ON order_items(vehicle_id);

CREATE INDEX IF NOT EXISTS quote_request_items_vehicle_idx
  ON quote_request_items(vehicle_id);
