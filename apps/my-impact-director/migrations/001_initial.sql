BEGIN;
CREATE SCHEMA IF NOT EXISTS director;
REVOKE ALL ON SCHEMA director FROM PUBLIC;
CREATE TABLE IF NOT EXISTS director.users (
 id text PRIMARY KEY, email text NOT NULL, name text NOT NULL, organisation text,
 created_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS director.reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL REFERENCES director.users(id),
 title text NOT NULL, organisation text NOT NULL DEFAULT '', source_url text, reporting_period text,
 sha256 text NOT NULL, file_bytes bytea NOT NULL, pages jsonb, extraction_notes jsonb NOT NULL DEFAULT '[]',
 consent_version text NOT NULL, quality_consent boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '180 days',
 UNIQUE(owner_id,sha256), CHECK(octet_length(file_bytes)<=4000000)
);
CREATE INDEX IF NOT EXISTS reports_owner_created ON director.reports(owner_id,created_at DESC);
CREATE TABLE IF NOT EXISTS director.reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), report_id uuid NOT NULL REFERENCES director.reports(id) ON DELETE CASCADE,
 version text NOT NULL, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','complete','failed')),
 stage integer NOT NULL DEFAULT 0 CHECK(stage>=0 AND stage<=15), visual_cursor integer NOT NULL DEFAULT 0, stage_attempts integer NOT NULL DEFAULT 0, attempts integer NOT NULL DEFAULT 0,
 lease_token uuid, lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 context jsonb, claims jsonb, findings jsonb NOT NULL DEFAULT '[]', result jsonb,
 error_code text, error_message text, cost_usd numeric(12,6) NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(report_id,version)
);
CREATE INDEX IF NOT EXISTS reviews_queue ON director.reviews(status,next_attempt_at,lease_until);
CREATE TABLE IF NOT EXISTS director.processing_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, review_id uuid NOT NULL REFERENCES director.reviews(id) ON DELETE CASCADE,
 stage integer NOT NULL, attempt integer NOT NULL, status text NOT NULL, model text, response_id text,
 input_tokens integer, output_tokens integer, cost_usd numeric(12,6), duration_ms integer, error_code text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS director.enquiries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL REFERENCES director.users(id),
 review_id uuid REFERENCES director.reviews(id) ON DELETE SET NULL, service text NOT NULL, message text NOT NULL,
 share_review boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'new', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enquiries_owner ON director.enquiries(owner_id,created_at DESC);
CREATE TABLE IF NOT EXISTS director.rate_limits (key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS director.audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id text NOT NULL, action text NOT NULL,
 resource_id text, reason text, created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON ALL TABLES IN SCHEMA director FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA director FROM PUBLIC;
COMMIT;
