BEGIN;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS transmission text,
  ADD COLUMN IF NOT EXISTS body_type text,
  ADD COLUMN IF NOT EXISTS tire_front text,
  ADD COLUMN IF NOT EXISTS tire_rear text,
  ADD COLUMN IF NOT EXISTS wheel_size text,
  ADD COLUMN IF NOT EXISTS oil_spec text,
  ADD COLUMN IF NOT EXISTS coolant_spec text;

COMMIT;
