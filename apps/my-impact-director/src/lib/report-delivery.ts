import { EDIT_ATTRIBUTION, EDIT_CAVEAT } from "./branding";
import { query } from "./db";
import { emailEnabled } from "./email-save";
import type { Framework } from "./rubric";
export async function sendPendingReports() {
  if (!emailEnabled()) return;
  const rows = await query<{
    id: string;
    review_id: string;
    owner_id: string;
    email: string;
    framework: Framework | null;
  }>(
    `WITH picked AS (SELECT id FROM director.report_deliveries WHERE delivered_at IS NULL AND attempts<8 AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 3), claimed AS (UPDATE director.report_deliveries d SET lease_until=now()+interval '5 minutes',attempts=attempts+1 FROM picked WHERE d.id=picked.id RETURNING d.*) SELECT c.id,c.email,c.review_id,v.framework FROM claimed c JOIN director.reviews v ON v.id=c.review_id JOIN director.reports r ON r.id=v.report_id WHERE v.status='complete' AND v.framework IS DISTINCT FROM 'document' AND jsonb_typeof(v.result)='object' AND r.expires_at>now()`,
  );
  for (const row of rows) {
    try {
      const link = new URL("/open/" + row.review_id, process.env.APP_ORIGIN)
        .href;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "idempotency-key": "mid-report-" + row.id,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [row.email],
          subject:
            row.framework === "report"
              ? "The Impact Design Review — your review is ready"
              : `Your ${row.framework === "claims" ? "Social Impact Claims Code" : row.framework === "excellence" ? "Social Impact Excellence" : "impact report"} review is ready`,
          text: `${row.framework === "report" ? `THE IMPACT DESIGN REVIEW\nIndicative Creative Assessment\n${EDIT_ATTRIBUTION}\n${EDIT_CAVEAT}\n\n` : ""}Your digital report is ready. Open it in your My Impact Director account: ${link}\n\nYou control who can read this assessment. To invite someone else, open the report and select Create sharing link.`,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw Error("Email transport unavailable");
      const receipt = await response.json();
      await query(
        "UPDATE director.report_deliveries SET delivered_at=now(),receipt=$2,lease_until=NULL WHERE id=$1",
        [row.id, String(receipt.id || "")],
      );
      await query(
        "INSERT INTO director.daily_metrics(event,count) VALUES('full_report_delivered',1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
      );
    } catch {
      await query(
        "UPDATE director.report_deliveries SET lease_until=NULL,next_attempt_at=now()+interval '5 minutes' WHERE id=$1",
        [row.id],
      );
    }
  }
}
