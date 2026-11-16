-- Additive vocabulary expansion; existing framework scores and review rows are preserved.
ALTER TABLE director.reviews
 DROP CONSTRAINT IF EXISTS reviews_framework_check,
 ADD CONSTRAINT reviews_framework_check CHECK(framework IN ('document','claims','excellence','report')),
 DROP CONSTRAINT IF EXISTS reviews_stage_check,
 ADD CONSTRAINT reviews_stage_check CHECK(stage>=0 AND stage<=21);
