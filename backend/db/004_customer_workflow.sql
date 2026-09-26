BEGIN;

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS offer_ref text,
  ADD COLUMN IF NOT EXISTS delivery_hours_max integer,
  ADD COLUMN IF NOT EXISTS returnable boolean,
  ADD COLUMN IF NOT EXISTS price_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS cart_items_offer_ref_idx
  ON cart_items(cart_id, offer_ref) WHERE offer_ref IS NOT NULL;

ALTER TABLE quote_request_items
  ADD COLUMN IF NOT EXISTS offer_ref text,
  ADD COLUMN IF NOT EXISTS returnable boolean,
  ADD COLUMN IF NOT EXISTS delivery_hours integer,
  ADD COLUMN IF NOT EXISTS availability integer,
  ADD COLUMN IF NOT EXISTS price_checked_at timestamptz;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS returnable boolean;

COMMIT;
