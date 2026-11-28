BEGIN;

CREATE TABLE IF NOT EXISTS director.assessment_promotions (
 code text PRIMARY KEY CHECK (code ~ '^[A-Z0-9_-]{3,32}$'),
 stripe_code_id text UNIQUE CHECK (stripe_code_id ~ '^promo_[A-Za-z0-9]+$'),
 discount_pence integer NOT NULL CHECK (discount_pence BETWEEN 1 AND 11900),
 max_redemptions integer NOT NULL CHECK (max_redemptions > 0),
 starts_at timestamptz NOT NULL DEFAULT now(),
 ends_at timestamptz,
 eligibility text NOT NULL DEFAULT 'any' CHECK (eligibility IN ('any', 'first_human_purchase')),
 active boolean NOT NULL DEFAULT false,
 CHECK (ends_at IS NULL OR ends_at > starts_at),
 CHECK (NOT active OR stripe_code_id IS NOT NULL)
);

INSERT INTO director.assessment_promotions(code, discount_pence, max_redemptions, eligibility)
VALUES ('FOUNDING50', 5000, 20, 'first_human_purchase') ON CONFLICT (code) DO NOTHING;

-- Financial records outlive source report deletion. Report and assessment IDs
-- are snapshots, while the owner reference is removed on account deletion.
CREATE TABLE IF NOT EXISTS director.assessment_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id text REFERENCES director.users(id) ON DELETE SET NULL,
 report_id uuid NOT NULL,
 review_id uuid NOT NULL,
 framework text NOT NULL CHECK (framework IN ('claims','excellence','report')),
 tier text NOT NULL CHECK (tier IN ('advanced','ultimate','human')),
 currency text NOT NULL DEFAULT 'gbp' CHECK (currency = 'gbp'),
 stripe_account text NOT NULL,
 state text NOT NULL DEFAULT 'creating' CHECK (state IN ('creating','open','expired','paid')),
 list_pence integer NOT NULL CHECK (list_pence > 0),
 promo_code text REFERENCES director.assessment_promotions(code),
 stripe_promo_id text,
 stripe_price_id text NOT NULL,
 stripe_product_id text NOT NULL,
 discount_pence integer NOT NULL CHECK (discount_pence >= 0),
 credit_pence integer NOT NULL CHECK (credit_pence >= 0),
 amount_pence integer NOT NULL CHECK (amount_pence >= 0),
 paid_pence integer NOT NULL DEFAULT 0 CHECK (paid_pence >= 0 AND paid_pence <= amount_pence),
 refunded_pence integer NOT NULL DEFAULT 0 CHECK (refunded_pence >= 0 AND refunded_pence <= paid_pence),
 blocked_pence integer NOT NULL DEFAULT 0 CHECK (blocked_pence >= 0 AND blocked_pence <= paid_pence - refunded_pence),
 dispute_status text,
 stripe_fee_pence integer CHECK (stripe_fee_pence >= 0),
 processing_cost_usd numeric(12,6) CHECK (processing_cost_usd >= 0),
 stripe_session_id text UNIQUE,
 stripe_intent_id text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 paid_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (list_pence = amount_pence + credit_pence + discount_pence),
 CHECK ((promo_code IS NULL) = (discount_pence = 0)),
 CHECK ((stripe_promo_id IS NULL) = (promo_code IS NULL)),
 CHECK ((state = 'paid') = (paid_at IS NOT NULL)),
 CHECK (state <> 'paid' OR paid_pence = amount_pence),
 CHECK (state <> 'paid' OR stripe_intent_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS assessment_orders_one_checkout
 ON director.assessment_orders(owner_id, report_id, framework)
 WHERE state IN ('creating','open');
CREATE INDEX IF NOT EXISTS assessment_orders_scope
 ON director.assessment_orders(owner_id, report_id, framework, paid_at);
CREATE INDEX IF NOT EXISTS assessment_orders_promotion
 ON director.assessment_orders(promo_code, state)
 WHERE promo_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS director.assessment_payment_events (
 event_id text PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES director.assessment_orders(id),
 event_type text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS director.assessment_project_credits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 human_order_id uuid NOT NULL UNIQUE REFERENCES director.assessment_orders(id),
 owner_id text REFERENCES director.users(id) ON DELETE SET NULL,
 report_id uuid NOT NULL,
 framework text NOT NULL CHECK (framework IN ('claims','excellence','report')),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 UNIQUE (owner_id, report_id, framework),
 CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS director.assessment_project_redemptions (
 credit_id uuid PRIMARY KEY REFERENCES director.assessment_project_credits(id),
 founder_id text NOT NULL,
 project_ref text NOT NULL,
 project_fee_pence integer NOT NULL CHECK (project_fee_pence > 0),
 applied_pence integer NOT NULL CHECK (applied_pence > 0 AND applied_pence <= project_fee_pence),
 commissioned_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_project_redemptions_ref
 ON director.assessment_project_redemptions(lower(project_ref));

REVOKE ALL ON director.assessment_promotions, director.assessment_orders,
 director.assessment_payment_events, director.assessment_project_credits,
 director.assessment_project_redemptions FROM PUBLIC;

DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mid_validation_runtime') THEN
   GRANT SELECT, INSERT, UPDATE ON director.assessment_promotions, director.assessment_orders,
     director.assessment_payment_events, director.assessment_project_credits,
     director.assessment_project_redemptions TO mid_validation_runtime;
 END IF;
END $$;

COMMIT;
