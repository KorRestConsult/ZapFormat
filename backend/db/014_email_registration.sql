BEGIN;
CREATE TABLE IF NOT EXISTS email_registration_challenges (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  code_hash text NOT NULL,
  customer_type text NOT NULL DEFAULT 'individual'
    CHECK (customer_type IN ('individual','service')),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_registration_pending_idx
  ON email_registration_challenges(email,created_at DESC);
CREATE INDEX IF NOT EXISTS email_registration_expiry_idx
  ON email_registration_challenges(expires_at);
COMMIT;
