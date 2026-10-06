-- Run explicitly against the droplet's isolated picture-service database.
-- Runtime never creates or alters schema. No Supabase dependency.
BEGIN;
CREATE TABLE IF NOT EXISTS picture_orders (
  id uuid PRIMARY KEY,
  access_hash char(64) NOT NULL,
  pack_id text NOT NULL CHECK (pack_id IN ('starter','growth','daily','bulk100')),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 4),
  picture_count integer NOT NULL CHECK (picture_count BETWEEN 1 AND 120),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  email text NOT NULL,
  name text NOT NULL,
  brief jsonb NOT NULL,
  scenes jsonb NOT NULL DEFAULT '[]',
  assets jsonb NOT NULL DEFAULT '[]',
  files jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'awaiting_payment',
  resume_status text,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded','disputed')),
  stripe_session_id text UNIQUE,
  stripe_payment_intent text UNIQUE,
  checkout_session_id text,
  checkout_url text,
  checkout_expires_at timestamptz,
  checkout_attempt integer NOT NULL DEFAULT 0,
  plan_approved_at timestamptz,
  owner_released_at timestamptz,
  revision_count integer NOT NULL DEFAULT 0 CHECK (revision_count BETWEEN 0 AND 1),
  revision_notes text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS picture_jobs (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES picture_orders(id),
  kind text NOT NULL CHECK (kind IN ('plan','image')),
  scene_index integer,
  revision integer NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','leased','completed','failed','uncertain','cancelled')),
  attempt integer NOT NULL DEFAULT 0,
  lease_token uuid,
  worker_id text,
  lease_until timestamptz,
  provider_started_at timestamptz,
  provider_request_id text,
  reserved_cents integer NOT NULL DEFAULT 0,
  reserved_attempt integer NOT NULL DEFAULT 0,
  actual_cents integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (order_id,kind,scene_index,revision)
);
CREATE TABLE IF NOT EXISTS picture_checkout_sessions (
  id text PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES picture_orders(id),
  attempt integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id,attempt)
);
CREATE INDEX IF NOT EXISTS picture_jobs_claim ON picture_jobs(state,created_at);
CREATE INDEX IF NOT EXISTS picture_orders_updated ON picture_orders(updated_at DESC);
CREATE TABLE IF NOT EXISTS picture_spend (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES picture_jobs(id),
  order_id uuid NOT NULL REFERENCES picture_orders(id),
  cents integer NOT NULL CHECK (cents > 0),
  attempt integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS picture_spend_day ON picture_spend(created_at);
CREATE TABLE IF NOT EXISTS picture_events (
  event_id text PRIMARY KEY,
  kind text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS picture_payment_stops (
  payment_intent text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('refunded','disputed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS picture_rate_limits (
  key char(64) NOT NULL,
  bucket bigint NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key,bucket)
);
CREATE TABLE IF NOT EXISTS picture_audit (
  id bigserial PRIMARY KEY,
  order_id uuid REFERENCES picture_orders(id),
  action text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS picture_worker_health (
  id text PRIMARY KEY,
  last_seen timestamptz NOT NULL DEFAULT now()
);
COMMIT;
