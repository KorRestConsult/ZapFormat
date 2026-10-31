BEGIN;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer','admin','owner','courier','warehouse','manager'));

CREATE TABLE IF NOT EXISTS staff_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  requested_role text NOT NULL DEFAULT 'courier' CHECK (requested_role = 'courier'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS staff_applications_status_idx ON staff_applications(status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS courier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES users(id),
  assigned_by uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','accepted','picked_up','delivered','problem','cancelled')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS courier_assignments_courier_idx ON courier_assignments(courier_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS staff_activity (
  id bigserial PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_activity_created_idx ON staff_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS staff_activity_actor_idx ON staff_activity(actor_id, created_at DESC);
COMMIT;
