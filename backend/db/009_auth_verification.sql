BEGIN;

CREATE TABLE IF NOT EXISTS auth_challenges (
  id uuid PRIMARY KEY,
  purpose text NOT NULL CHECK (purpose IN ('register','password_reset')),
  phone text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text,
  surname text,
  password_hash text,
  code_hash text NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_challenges_phone_purpose_idx
  ON auth_challenges(phone, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS auth_challenges_expires_idx
  ON auth_challenges(expires_at);

COMMIT;
