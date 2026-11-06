BEGIN;

-- Customer Telegram is independent of the owner's order notification bot.
-- No chat is connected by phone number, email or Telegram username alone.
CREATE TABLE IF NOT EXISTS customer_telegram_link_codes (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_telegram_link_codes_user_idx
  ON customer_telegram_link_codes(user_id,expires_at DESC);

CREATE TABLE IF NOT EXISTS customer_telegram_links (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  chat_id text NOT NULL UNIQUE CHECK (chat_id ~ '^[0-9]{5,20}$'),
  enabled boolean NOT NULL DEFAULT true,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_telegram_links_chat_idx
  ON customer_telegram_links(chat_id) WHERE enabled = true;

-- Durable, retryable and deduplicated by the notification's DB identity.
-- No messages are enqueued before the containing transaction commits.
CREATE TABLE IF NOT EXISTS customer_telegram_deliveries (
  notification_id uuid PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sending','sent','failed')),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_until timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_telegram_deliveries_queue_idx
  ON customer_telegram_deliveries(status,next_attempt_at,created_at)
  WHERE status <> 'sent';

COMMIT;
