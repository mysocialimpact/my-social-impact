BEGIN;
-- Extend the app's existing private tables. Runtime permissions stay unchanged.
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS account_email text;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS canonical_owner_id text REFERENCES director.users(id);
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS password_verified_at timestamptz;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS marketing_recorded_at timestamptz;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS marketing_wording_version text;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS marketing_wording text;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS marketing_source text;
CREATE INDEX IF NOT EXISTS users_canonical_owner ON director.users(canonical_owner_id);
ALTER TABLE director.email_links ADD COLUMN IF NOT EXISTS auth_subject text;
ALTER TABLE director.email_links ADD COLUMN IF NOT EXISTS guest_owner_id text;
ALTER TABLE director.email_links ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'verification';
ALTER TABLE director.email_links ADD COLUMN IF NOT EXISTS share_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS email_links_share_id ON director.email_links(share_id);
COMMIT;
