-- Social authentication schema generated from installed Better Auth 1.7.28.
BEGIN;
CREATE TABLE IF NOT EXISTS director."auth_users" (
 id text PRIMARY KEY,
 "name" text NOT NULL,
 "email" text NOT NULL UNIQUE,
 "emailVerified" boolean NOT NULL DEFAULT false,
 "image" text,
 "createdAt" timestamptz NOT NULL,
 "updatedAt" timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS director."auth_sessions" (
 id text PRIMARY KEY,
 "expiresAt" timestamptz NOT NULL,
 "token" text NOT NULL UNIQUE,
 "createdAt" timestamptz NOT NULL,
 "updatedAt" timestamptz NOT NULL,
 "ipAddress" text,
 "userAgent" text,
 "userId" text NOT NULL REFERENCES director."auth_users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "userId_auth_sessions_idx" ON director."auth_sessions"("userId");
CREATE TABLE IF NOT EXISTS director."auth_accounts" (
 id text PRIMARY KEY,
 "accountId" text NOT NULL,
 "providerId" text NOT NULL,
 "userId" text NOT NULL REFERENCES director."auth_users"("id") ON DELETE CASCADE,
 "accessToken" text,
 "refreshToken" text,
 "idToken" text,
 "accessTokenExpiresAt" timestamptz,
 "refreshTokenExpiresAt" timestamptz,
 "scope" text,
 "password" text,
 "createdAt" timestamptz NOT NULL,
 "updatedAt" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "userId_auth_accounts_idx" ON director."auth_accounts"("userId");
CREATE TABLE IF NOT EXISTS director."auth_verifications" (
 id text PRIMARY KEY,
 "identifier" text NOT NULL,
 "value" text NOT NULL,
 "expiresAt" timestamptz NOT NULL,
 "createdAt" timestamptz NOT NULL,
 "updatedAt" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "identifier_auth_verifications_idx" ON director."auth_verifications"("identifier");
CREATE TABLE IF NOT EXISTS director."auth_rate_limits" (
 id text PRIMARY KEY,
 "key" text NOT NULL UNIQUE,
 "count" integer NOT NULL,
 "lastRequest" bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_provider_subject ON director.auth_accounts("providerId","accountId");
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS canonical_owner_id text;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS account_class text NOT NULL DEFAULT 'unclassified' CHECK(account_class IN ('unclassified','founder','test','customer'));
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS classification_reason text;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS retired_at timestamptz;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS last_auth_method text;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS marketing_recorded_at timestamptz;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS marketing_wording_version text;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS marketing_wording text;
ALTER TABLE director.users ADD COLUMN IF NOT EXISTS marketing_source text;
CREATE INDEX IF NOT EXISTS users_canonical_owner ON director.users(canonical_owner_id);
CREATE INDEX IF NOT EXISTS users_activity ON director.users(last_seen) WHERE NOT is_anonymous;
CREATE TABLE IF NOT EXISTS director.auth_principals (
 auth_user_id text PRIMARY KEY REFERENCES director.auth_users(id) ON DELETE CASCADE,
 owner_id text NOT NULL REFERENCES director.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_principals_owner ON director.auth_principals(owner_id);
CREATE TABLE IF NOT EXISTS director.workspace_link_proofs (
 token_hash text PRIMARY KEY, owner_id text NOT NULL REFERENCES director.users(id),
 expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE director.workspace_link_proofs ADD COLUMN IF NOT EXISTS founder_authority boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS workspace_link_expiry ON director.workspace_link_proofs(expires_at);
ALTER TABLE director.email_links ADD COLUMN IF NOT EXISTS return_path text NOT NULL DEFAULT '/reviews';
ALTER TABLE director.audit ADD COLUMN IF NOT EXISTS event_key text;
ALTER TABLE director.audit ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS audit_event_key ON director.audit(event_key);
CREATE INDEX IF NOT EXISTS audit_actor_created ON director.audit(actor_id,created_at DESC);
ALTER TABLE director.enquiries ADD COLUMN IF NOT EXISTS converted_at timestamptz;
REVOKE ALL ON director.auth_users,director.auth_sessions,director.auth_accounts,director.auth_verifications,director.auth_rate_limits,director.auth_principals FROM PUBLIC;
REVOKE ALL ON director.workspace_link_proofs FROM PUBLIC;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='users_canonical_owner_id_fkey' AND conrelid='director.users'::regclass) THEN
  ALTER TABLE director.users ADD CONSTRAINT users_canonical_owner_id_fkey FOREIGN KEY(canonical_owner_id) REFERENCES director.users(id);
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mid_production_runtime') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON director.workspace_link_proofs TO mid_production_runtime;
  GRANT SELECT,INSERT,UPDATE,DELETE ON director.auth_users,director.auth_sessions,director.auth_accounts,director.auth_verifications,director.auth_rate_limits,director.auth_principals TO mid_production_runtime;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mid_validation_runtime') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON director.workspace_link_proofs TO mid_validation_runtime;
  GRANT SELECT,INSERT,UPDATE,DELETE ON director.auth_users,director.auth_sessions,director.auth_accounts,director.auth_verifications,director.auth_rate_limits,director.auth_principals TO mid_validation_runtime;
 END IF;
END $$;
COMMIT;
