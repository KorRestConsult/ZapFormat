BEGIN;
-- Owner credentials remain untouched. A private person and a workshop
-- can register separate customer profiles sharing the owner's email.
DROP INDEX IF EXISTS users_email_unique;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_scope_type_unique
  ON users (lower(email), role, customer_type) WHERE email IS NOT NULL;
COMMIT;
