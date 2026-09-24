BEGIN;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS current_mileage integer,
  ADD COLUMN IF NOT EXISTS mileage_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS vehicle_mileage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mileage integer NOT NULL CHECK (mileage >= 0),
  source text NOT NULL DEFAULT 'manual',
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicle_mileage_logs_vehicle_idx
  ON vehicle_mileage_logs(vehicle_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS vehicle_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measurement_type text NOT NULL,
  value numeric(14,3),
  value_text text,
  unit text,
  note text,
  measured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_measurement_value_required
    CHECK (value IS NOT NULL OR value_text IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS vehicle_measurements_vehicle_idx
  ON vehicle_measurements(vehicle_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS vehicle_measurements_type_idx
  ON vehicle_measurements(vehicle_id, measurement_type, measured_at DESC);

CREATE TABLE IF NOT EXISTS vehicle_maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code text,
  title text NOT NULL,
  interval_km integer,
  interval_months integer,
  last_service_mileage integer,
  last_service_at date,
  next_service_mileage integer,
  next_service_at date,
  part_search_query text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicle_maintenance_plans_vehicle_idx
  ON vehicle_maintenance_plans(vehicle_id, is_active);

CREATE TABLE IF NOT EXISTS vehicle_maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  mileage integer,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  note text,
  cost_amount numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicle_maintenance_records_vehicle_idx
  ON vehicle_maintenance_records(vehicle_id, service_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS vehicle_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  title text NOT NULL,
  due_mileage integer,
  due_at date,
  is_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicle_reminders_vehicle_idx
  ON vehicle_reminders(vehicle_id, is_done, due_at);

COMMIT;
