BEGIN;

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_url_snapshot text,
  ADD COLUMN IF NOT EXISTS privacy_url_snapshot text;

COMMIT;
