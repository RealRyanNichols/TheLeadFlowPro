CREATE TABLE IF NOT EXISTS ads_brain_run (
  id bigserial PRIMARY KEY,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  ok boolean NOT NULL DEFAULT false,
  mode text NOT NULL CHECK (mode = 'observe_only'),
  account_id text NOT NULL CHECK (account_id = '1637329904238602'),
  meta_state text NOT NULL CHECK (meta_state IN ('connected','disconnected','error')),
  leads_seen integer NOT NULL DEFAULT 0 CHECK (leads_seen >= 0),
  error text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ads_brain_run_started_idx ON ads_brain_run (started_at DESC);

CREATE TABLE IF NOT EXISTS ads_brain_snapshot (
  id bigserial PRIMARY KEY,
  run_id bigint NOT NULL REFERENCES ads_brain_run(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS ads_brain_snapshot_captured_idx ON ads_brain_snapshot (captured_at DESC);

CREATE TABLE IF NOT EXISTS ads_brain_alert (
  dedupe_key text PRIMARY KEY,
  severity text NOT NULL CHECK (severity IN ('critical','high','warning','info')),
  category text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  resolved_at timestamptz
);

COMMENT ON TABLE ads_brain_snapshot IS 'Aggregate LeadFlow advertising and CRM facts only. No lead PII and no campaign mutation capability.';
