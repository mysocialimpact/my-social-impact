-- Widen the job vocabulary for the pre-scoring editorial inspection.
-- Existing rows, stages and results are retained unchanged.
ALTER TABLE director.reviews
 DROP CONSTRAINT IF EXISTS reviews_stage_check,
 ADD CONSTRAINT reviews_stage_check CHECK(stage>=0 AND stage<=23);
