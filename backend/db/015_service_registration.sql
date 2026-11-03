BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_name text;
ALTER TABLE auth_challenges ADD COLUMN IF NOT EXISTS service_name text;
ALTER TABLE email_registration_challenges ADD COLUMN IF NOT EXISTS service_name text;
COMMIT;
