import { EDIT_ATTRIBUTION, EDIT_CAVEAT } from "./branding";
import { createHmac } from "node:crypto";
import { query } from "./db";
import { emailEnabled } from "./email-save";
import { tokenHash } from "./access";
import { exportPdf } from "./export";
import type { ReviewResult } from "./pipeline";
export async function sendPendingReports() {
  if (!emailEnabled()) return;
  const rows = await query<{
    id: string;
    review_id: string;
    owner_id: string;
    email: string;
    token: string | null;
    has_password: boolean;
    result: ReviewResult;
  }>(
    `WITH picked AS (SELECT id FROM director.report_deliveries WHERE delivered_at IS NULL AND attempts<8 AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 3), claimed AS (UPDATE director.report_deliveries d SET lease_until=now()+interval '5 minutes',attempts=attempts+1 FROM picked WHERE d.id=picked.id RETURNING d.*) SELECT c.*,v.result,EXISTS(SELECT 1 FROM director.users a WHERE a.canonical_owner_id=c.owner_id AND a.password_verified_at IS NOT NULL) AS has_password FROM claimed c JOIN director.reviews v ON v.id=c.review_id JOIN director.reports r ON r.id=v.report_id WHERE v.status='complete' AND v.result IS NOT NULL AND r.expires_at>now()`,
  );
  for (const row of rows) {
    try {
      if (!process.env.CRON_SECRET) throw Error("Delivery signing unavailable");
      const token = createHmac("sha256", process.env.CRON_SECRET)
        .update("report-delivery:" + row.id)
        .digest("base64url");
      await query(
        "INSERT INTO director.email_links(token_hash,owner_id,review_id,email,expires_at) VALUES($1,$2,$3,$4,now()+interval '30 minutes') ON CONFLICT(token_hash) DO UPDATE SET expires_at=GREATEST(email_links.expires_at,excluded.expires_at)",
        [tokenHash(token), row.owner_id, row.review_id, row.email],
      );
      const pdf = await exportPdf(row.result);
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
            row.result.framework === "report"
              ? "The Impact Edit — your review is ready"
              : `Your ${row.result.framework === "claims" ? "Social Impact Claims Code" : row.result.framework === "excellence" ? "Social Impact Excellence" : "impact report"} review is ready`,
          text: `${row.result.framework === "report" ? `THE IMPACT EDIT\nIndicative Creative Assessment\n${EDIT_ATTRIBUTION}\n${EDIT_CAVEAT}\n\n` : ""}Your free detailed review is attached. ${row.has_password ? `Log in with your email and password to return anytime: ${process.env.APP_ORIGIN}/login?next=${encodeURIComponent(`/reviews/${row.review_id}`)}` : `Open your private return link within 30 minutes: ${process.env.APP_ORIGIN}/access#${token}\nYou can also create a password account using this address: ${process.env.APP_ORIGIN}/register`}\n\nThis is a requested report email. Manage optional news preferences in Account.`,
          attachments: [
            {
              filename: "my-impact-director-review.pdf",
              content: pdf.toString("base64"),
            },
          ],
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
