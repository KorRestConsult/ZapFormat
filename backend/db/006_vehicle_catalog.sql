-- Bind a garage vehicle to the verified ABCP carbase hierarchy.
-- These identifiers are catalog references only; they do not expose supplier credentials.
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS catalog_provider text,
  ADD COLUMN IF NOT EXISTS catalog_manufacturer_id text,
  ADD COLUMN IF NOT EXISTS catalog_model_id text,
  ADD COLUMN IF NOT EXISTS catalog_modification_id text,
  ADD COLUMN IF NOT EXISTS catalog_modification_name text,
  ADD COLUMN IF NOT EXISTS catalog_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS vehicles_catalog_modification_idx
  ON vehicles(catalog_provider, catalog_modification_id)
  WHERE catalog_modification_id IS NOT NULL;
