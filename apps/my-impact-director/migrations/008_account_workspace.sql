BEGIN;
-- Identity subjects are bound only after explicit email ownership proof.
CREATE TABLE IF NOT EXISTS director.account_identities (
 subject text PRIMARY KEY,
 owner_id text NOT NULL REFERENCES director.users(id) ON DELETE CASCADE,
 email text NOT NULL,
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_identities_owner ON director.account_identities(owner_id);
ALTER TABLE director.email_links ADD COLUMN IF NOT EXISTS auth_subject text;
ALTER TABLE director.email_links ADD COLUMN IF NOT EXISTS guest_owner_id text;
CREATE TABLE IF NOT EXISTS director.marketing_consent (
 owner_id text PRIMARY KEY REFERENCES director.users(id) ON DELETE CASCADE,
 opted_in boolean NOT NULL DEFAULT false,
 wording_version text NOT NULL,
 wording text NOT NULL,
 source text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS director.marketing_consent_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id text NOT NULL REFERENCES director.users(id) ON DELETE CASCADE,
 opted_in boolean NOT NULL,
 wording_version text NOT NULL,
 wording text NOT NULL,
 source text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS director.assessment_shares (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 review_id uuid NOT NULL REFERENCES director.reviews(id) ON DELETE CASCADE,
 owner_id text NOT NULL REFERENCES director.users(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS assessment_shares_owner ON director.assessment_shares(owner_id,review_id);
REVOKE ALL ON director.account_identities,director.marketing_consent,director.marketing_consent_events,director.assessment_shares FROM PUBLIC;
COMMIT;
