CREATE TABLE IF NOT EXISTS director.publication_links (
  review_id uuid PRIMARY KEY REFERENCES director.reviews(id) ON DELETE CASCADE,
  nonce uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'mid_production_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON director.publication_links TO mid_production_runtime;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'mid_validation_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON director.publication_links TO mid_validation_runtime;
  END IF;
END $$;
