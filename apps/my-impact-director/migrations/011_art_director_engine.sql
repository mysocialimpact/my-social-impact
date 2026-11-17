BEGIN;
ALTER TABLE director.reviews ADD COLUMN IF NOT EXISTS engine_state jsonb;
ALTER TABLE director.reviews
 DROP CONSTRAINT IF EXISTS reviews_stage_check,
 ADD CONSTRAINT reviews_stage_check CHECK(stage>=0 AND stage<=26);
COMMIT;
