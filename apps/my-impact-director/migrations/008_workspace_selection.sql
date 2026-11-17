CREATE TABLE IF NOT EXISTS director.workspace_selections (
  owner_id text PRIMARY KEY REFERENCES director.users(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES director.reports(id) ON DELETE CASCADE,
  selected_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON director.workspace_selections FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mid_production_runtime') THEN
    GRANT SELECT,INSERT,UPDATE,DELETE ON director.workspace_selections TO mid_production_runtime;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mid_validation_runtime') THEN
    GRANT SELECT,INSERT,UPDATE,DELETE ON director.workspace_selections TO mid_validation_runtime;
  END IF;
END $$;
