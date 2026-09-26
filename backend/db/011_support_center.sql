BEGIN;

CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number bigserial UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('order','quote','vin','return','account','delivery','payment','other')),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','in_progress','waiting_customer','resolved','closed')),
  linked_type text
    CHECK (linked_type IS NULL OR linked_type IN ('order','quote','vin','return')),
  linked_id text,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_requests_user_created_idx
  ON support_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_requests_queue_idx
  ON support_requests(status, created_at ASC);

CREATE TABLE IF NOT EXISTS support_messages (
  id bigserial PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES support_requests(id) ON DELETE CASCADE,
  actor_type text NOT NULL
    CHECK (actor_type IN ('customer','staff','system')),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_request_idx
  ON support_messages(request_id, created_at, id);

COMMIT;
