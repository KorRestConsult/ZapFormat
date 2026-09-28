-- Persist customer cart selections between devices without exposing procurement data.
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS offer_token text;

CREATE INDEX IF NOT EXISTS cart_items_client_id_idx
  ON cart_items(cart_id, client_id);
