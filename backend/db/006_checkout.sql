BEGIN;

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS fulfillment_method text NOT NULL DEFAULT 'confirmation',
  ADD COLUMN IF NOT EXISTS pickup_point_id uuid REFERENCES pickup_points(id),
  ADD COLUMN IF NOT EXISTS delivery_address_id uuid REFERENCES user_addresses(id),
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_phone text,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'after_confirmation',
  ADD COLUMN IF NOT EXISTS customer_comment text,
  ADD COLUMN IF NOT EXISTS verified_total numeric(14,2),
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(14,2),
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checkout_version integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS quote_requests_fulfillment_idx
  ON quote_requests(fulfillment_method, created_at DESC);

CREATE INDEX IF NOT EXISTS quote_requests_vehicle_idx
  ON quote_requests(vehicle_id, created_at DESC)
  WHERE vehicle_id IS NOT NULL;

COMMIT;
