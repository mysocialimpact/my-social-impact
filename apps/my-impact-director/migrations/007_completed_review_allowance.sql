BEGIN;
-- One charge per successfully assessed source report, independent of the three
-- frameworks. No report FK: deleting a result must not reset a daily allowance.
CREATE TABLE IF NOT EXISTS director.completed_reports (
 report_id uuid PRIMARY KEY,
 owner_id text NOT NULL REFERENCES director.users(id) ON DELETE CASCADE,
 completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS completed_reports_owner_time ON director.completed_reports(owner_id,completed_at DESC);
INSERT INTO director.completed_reports(report_id,owner_id,completed_at)
SELECT r.id,r.owner_id,min(v.updated_at) FROM director.reports r
JOIN director.reviews v ON v.report_id=r.id
WHERE v.status='complete' AND v.framework IS DISTINCT FROM 'document' AND v.result IS NOT NULL AND v.result<>'null'::jsonb
GROUP BY r.id,r.owner_id ON CONFLICT DO NOTHING;
REVOKE ALL ON director.completed_reports FROM PUBLIC;
COMMIT;
