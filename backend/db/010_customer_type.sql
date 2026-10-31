BEGIN;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'individual'
    CHECK (customer_type IN ('individual','service'));
ALTER TABLE auth_challenges
  ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'individual'
    CHECK (customer_type IN ('individual','service'));
COMMIT;
