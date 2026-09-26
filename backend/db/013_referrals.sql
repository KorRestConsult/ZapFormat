BEGIN;

CREATE TABLE IF NOT EXISTS referral_codes (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6,16}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered','qualified','rewarded','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  CONSTRAINT referral_no_self CHECK (referrer_user_id <> referred_user_id)
);
CREATE INDEX IF NOT EXISTS referral_attributions_referrer_idx
  ON referral_attributions(referrer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referral_attributions_status_idx
  ON referral_attributions(status, created_at DESC);

CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('referral','adjustment','redeem','reversal')),
  reference_type text,
  reference_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loyalty_ledger_user_idx
  ON loyalty_ledger(user_id, created_at DESC);

COMMIT;
