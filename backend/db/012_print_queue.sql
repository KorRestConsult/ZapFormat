CREATE TABLE IF NOT EXISTS print_agent_pairings (
  id UUID PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS print_agents (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'invoice',
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  agent_id UUID REFERENCES print_agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cups_job_id TEXT,
  last_error TEXT,
  CONSTRAINT print_jobs_status_check CHECK (status IN ('queued','claimed','printed','failed')),
  CONSTRAINT print_jobs_unique_order_kind UNIQUE(order_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_queue ON print_jobs(status, created_at);
