import type { PoolClient } from "@neondatabase/serverless";

export async function recordCompletedReport(c: PoolClient, reportId: string) {
  await c.query(
    `INSERT INTO director.completed_reports(report_id,owner_id)
     SELECT id,owner_id FROM director.reports WHERE id=$1
     ON CONFLICT DO NOTHING`,
    [reportId],
  );
}
