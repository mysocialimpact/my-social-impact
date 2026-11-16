BEGIN;
ALTER TABLE director.reviews ADD COLUMN IF NOT EXISTS framework text CHECK(framework IN ('document','claims','excellence'));
ALTER TABLE director.reports ADD COLUMN IF NOT EXISTS understanding_ready boolean NOT NULL DEFAULT false;
ALTER TABLE director.reports ADD COLUMN IF NOT EXISTS understanding_context jsonb;
ALTER TABLE director.reports ADD COLUMN IF NOT EXISTS understanding_claims jsonb;
UPDATE director.reports r SET understanding_ready=true,understanding_context=v.context,understanding_claims=v.claims FROM director.reviews v WHERE v.report_id=r.id AND v.framework IS NULL AND v.status='complete' AND v.context IS NOT NULL AND v.claims IS NOT NULL AND r.pages IS NOT NULL AND NOT r.understanding_ready;
CREATE TABLE IF NOT EXISTS director.report_subscriptions (
 report_id uuid NOT NULL REFERENCES director.reports(id) ON DELETE CASCADE,
 owner_id text NOT NULL REFERENCES director.users(id) ON DELETE CASCADE, email text NOT NULL,
 verified_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(report_id,owner_id)
);
CREATE TABLE IF NOT EXISTS director.report_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), review_id uuid NOT NULL REFERENCES director.reviews(id) ON DELETE CASCADE,
 owner_id text NOT NULL REFERENCES director.users(id) ON DELETE CASCADE, email text NOT NULL,
 token text, attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz, delivered_at timestamptz, receipt text,
 UNIQUE(review_id,owner_id)
);
REVOKE ALL ON director.report_subscriptions,director.report_deliveries FROM PUBLIC;
COMMIT;
