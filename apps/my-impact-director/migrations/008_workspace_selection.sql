CREATE TABLE IF NOT EXISTS director.workspace_selections (
  owner_id text PRIMARY KEY REFERENCES director.users(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES director.reports(id) ON DELETE CASCADE,
  selected_at timestamptz NOT NULL DEFAULT now()
);
