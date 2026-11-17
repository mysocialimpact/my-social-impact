BEGIN;
CREATE TABLE IF NOT EXISTS director.contributions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id text REFERENCES director.users(id) ON DELETE SET NULL,
 report_id uuid REFERENCES director.reports(id) ON DELETE SET NULL,
 review_id uuid REFERENCES director.reviews(id) ON DELETE SET NULL,
 attempt_key uuid NOT NULL UNIQUE,
 amount_pence integer NOT NULL CHECK(amount_pence BETWEEN 100 AND 1000000),
 currency text NOT NULL DEFAULT 'gbp' CHECK(currency='gbp'),
 livemode boolean NOT NULL,
 stripe_account text NOT NULL,
 merchant_name text NOT NULL,
 receipt_email text,
 checkout_id text UNIQUE,
 payment_intent_id text UNIQUE,
 status text NOT NULL DEFAULT 'creating' CHECK(status IN ('creating','pending','processing','succeeded','failed','cancelled','partially_refunded','refunded')),
 refunded_pence integer NOT NULL DEFAULT 0 CHECK(refunded_pence>=0 AND refunded_pence<=amount_pence),
 paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contributions_owner ON director.contributions(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS contributions_revenue ON director.contributions(livemode,status,created_at DESC);
CREATE TABLE IF NOT EXISTS director.contribution_events (
 event_id text PRIMARY KEY,
 contribution_id uuid NOT NULL REFERENCES director.contributions(id) ON DELETE CASCADE,
 event_type text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON director.contributions,director.contribution_events FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mid_production_runtime') THEN
  REVOKE DELETE,TRUNCATE ON director.contributions,director.contribution_events FROM mid_production_runtime;
  GRANT SELECT,INSERT,UPDATE ON director.contributions,director.contribution_events TO mid_production_runtime;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mid_validation_runtime') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON director.contributions,director.contribution_events TO mid_validation_runtime;
 END IF;
END $$;
COMMIT;
