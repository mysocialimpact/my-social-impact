BEGIN;
ALTER TABLE director.reports DROP CONSTRAINT IF EXISTS reports_file_bytes_check;
ALTER TABLE director.reports ADD CONSTRAINT reports_file_bytes_check CHECK(octet_length(file_bytes)<=50000000);
CREATE TABLE IF NOT EXISTS director.uploads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id text NOT NULL REFERENCES director.users(id) ON DELETE CASCADE,
 title text NOT NULL, file_size integer NOT NULL CHECK(file_size BETWEEN 40 AND 50000000),
 review_id uuid REFERENCES director.reviews(id) ON DELETE SET NULL,
 lease_token uuid, lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour'
);
CREATE INDEX IF NOT EXISTS uploads_expiry ON director.uploads(expires_at);
CREATE TABLE IF NOT EXISTS director.upload_parts (
 upload_id uuid NOT NULL REFERENCES director.uploads(id) ON DELETE CASCADE,
 part integer NOT NULL CHECK(part BETWEEN 0 AND 16),
 bytes bytea NOT NULL CHECK(octet_length(bytes) BETWEEN 1 AND 3000000),
 sha256 text NOT NULL,
 PRIMARY KEY(upload_id,part)
);
REVOKE ALL ON director.uploads,director.upload_parts FROM PUBLIC;
COMMIT;
