BEGIN;
CREATE TABLE IF NOT EXISTS director.feedback (
 id uuid PRIMARY KEY, owner_id text REFERENCES director.users ON DELETE SET NULL, payload_hash text,
 rating smallint CHECK(rating BETWEEN 1 AND 5), comment text NOT NULL DEFAULT '',
 page text NOT NULL, section text NOT NULL DEFAULT '', review_id uuid REFERENCES director.reviews ON DELETE SET NULL,
 framework text, methodology text, models text, signed_in boolean, created_at timestamptz NOT NULL DEFAULT now(),
 email text, reply_consent boolean NOT NULL DEFAULT false, CHECK ((email IS NOT NULL) = reply_consent),
 status text NOT NULL DEFAULT 'new', priority text NOT NULL DEFAULT 'normal', decision text NOT NULL DEFAULT '',
 draft text NOT NULL DEFAULT '', human_attention boolean NOT NULL DEFAULT true, revision integer NOT NULL DEFAULT 0,
 analysis_state text NOT NULL DEFAULT 'skipped', analysis jsonb, analysis_after timestamptz NOT NULL DEFAULT now(),
 CHECK (rating IS NOT NULL OR length(comment)>0)
);
CREATE INDEX IF NOT EXISTS feedback_recent ON director.feedback(created_at DESC,id);
CREATE INDEX IF NOT EXISTS feedback_pending ON director.feedback(analysis_after) WHERE analysis_state='pending';
CREATE TABLE IF NOT EXISTS director.feedback_mail (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), feedback_id uuid NOT NULL REFERENCES director.feedback ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('notification','reply')), recipient text NOT NULL, body text NOT NULL,
 sender text, approved_by text, state text NOT NULL DEFAULT 'queued', attempts integer NOT NULL DEFAULT 0,
 next_attempt timestamptz NOT NULL DEFAULT now(), first_attempt timestamptz, receipt text, accepted_at timestamptz,
 UNIQUE(feedback_id,kind), CHECK(kind <> 'reply' OR approved_by IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS director.feedback_ai_usage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), feedback_id uuid REFERENCES director.feedback ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), model text NOT NULL, reserved_usd numeric NOT NULL,
 input_tokens int, cached_tokens int, output_tokens int, cost_usd numeric, failure text, response_id text
);
-- Historical feedback contained a free-form path. Retain a safe page group only.
WITH legacy AS (
 SELECT e.*, substring(message from '^Usefulness: ([1-5])/5')::integer AS stars,
 split_part(message,E'\n',2) AS source,
 regexp_replace(message,E'^Usefulness: [1-5]/5\nPage: [^\n]*\n\n','') AS original_comment
 FROM director.enquiries e WHERE service='feedback'
)
INSERT INTO director.feedback(id,owner_id,rating,comment,page,status,created_at)
SELECT id,owner_id,stars,CASE WHEN stars IS NOT NULL AND original_comment='No additional comment.' THEN '' ELSE original_comment END,
 CASE WHEN source='Page: /' THEN '/' WHEN source ~ '^Page: /(reviews|services|methodology|account|review|feedback|login|contact|privacy|terms)(/|$)'
 THEN '/'||substring(source from '^Page: /([a-z]+)') ELSE '/feedback' END,
 CASE WHEN status IN ('resolved','closed') THEN 'resolved' ELSE 'new' END,created_at FROM legacy
 WHERE stars IS NOT NULL OR original_comment<>'' ON CONFLICT(id) DO NOTHING;
REVOKE ALL ON director.feedback,director.feedback_mail,director.feedback_ai_usage FROM PUBLIC;
DO $$ DECLARE runtime text; BEGIN
 FOR runtime IN SELECT rolname FROM pg_roles WHERE rolname IN ('mid_validation_runtime','mid_production_runtime')
 AND has_table_privilege(rolname,'director.enquiries','INSERT') LOOP
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON director.feedback,director.feedback_mail,director.feedback_ai_usage TO %I',runtime);
 END LOOP;
END $$;
COMMIT;
