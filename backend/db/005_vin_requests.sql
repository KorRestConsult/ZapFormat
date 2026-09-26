BEGIN;

CREATE TABLE IF NOT EXISTS vin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  vin text,
  request_text text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  manager_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vin_requests_user_created_idx
  ON vin_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vin_requests_status_created_idx
  ON vin_requests(status, created_at DESC);

COMMIT;
