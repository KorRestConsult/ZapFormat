BEGIN;

CREATE TABLE IF NOT EXISTS quote_requests (
  id text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'zapformat-web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quote_requests_user_idx
  ON quote_requests(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quote_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  brand text,
  article text NOT NULL,
  description text,
  quantity integer NOT NULL CHECK (quantity > 0),
  comment text,
  quoted_price numeric(14,2),
  needs_confirmation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quote_request_items_request_idx
  ON quote_request_items(request_id);

COMMIT;
