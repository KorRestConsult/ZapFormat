BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source_quote_id text REFERENCES quote_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fulfillment_method text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_source_quote_unique
  ON orders(source_quote_id)
  WHERE source_quote_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_referral_reward_unique
  ON loyalty_ledger(user_id, kind, reference_type, reference_id)
  WHERE kind = 'referral'
    AND reference_type IS NOT NULL
    AND reference_id IS NOT NULL;

COMMIT;
