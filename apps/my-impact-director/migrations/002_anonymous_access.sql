BEGIN;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
ALTER TABLE director.reviews ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz;
ALTER TABLE director.enquiries ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE director.enquiries ADD COLUMN IF NOT EXISTS contact_email text;
CREATE TABLE IF NOT EXISTS director.access_sessions (
 token_hash text PRIMARY KEY, owner_id text NOT NULL REFERENCES director.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('guest','email')), created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS access_sessions_expiry ON director.access_sessions(expires_at);
CREATE TABLE IF NOT EXISTS director.email_links (
 token_hash text PRIMARY KEY, owner_id text NOT NULL REFERENCES director.users(id) ON DELETE CASCADE,
 review_id uuid REFERENCES director.reviews(id) ON DELETE CASCADE, email text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, used_at timestamptz, delivery_id text
);
CREATE TABLE IF NOT EXISTS director.review_grants (
 review_id uuid NOT NULL REFERENCES director.reviews(id) ON DELETE CASCADE,
 owner_id text NOT NULL REFERENCES director.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(review_id,owner_id)
);
CREATE TABLE IF NOT EXISTS director.daily_metrics (
 day date NOT NULL DEFAULT CURRENT_DATE, event text NOT NULL, count bigint NOT NULL DEFAULT 0, PRIMARY KEY(day,event)
);
REVOKE ALL ON director.access_sessions,director.email_links,director.review_grants,director.daily_metrics FROM PUBLIC;
COMMIT;
