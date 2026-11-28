import { query } from "./db";
import { emailEnabled } from "./email-save";
export async function sendFeedbackMail(feedbackId?: string) {
  if (!emailEnabled()) return;
  // Resend retains an idempotency key for 24 hours. Close uncertain deliveries before it expires.
  await query(
    `UPDATE director.feedback_mail SET state='uncertain' WHERE state IN ('queued','sending') AND next_attempt<=now() AND (attempts>=8 OR first_attempt<now()-interval '23 hours')`,
  );
  const [mail] = await query<{
    id: string;
    recipient: string;
    body: string;
    kind: string;
    sender: string;
    attempts: number;
  }>(
    `WITH candidate AS (SELECT id FROM director.feedback_mail WHERE state IN ('queued','sending') AND next_attempt<=now() AND ($2::uuid IS NULL OR feedback_id=$2) ORDER BY next_attempt FOR UPDATE SKIP LOCKED LIMIT 1)
    UPDATE director.feedback_mail m SET state='sending',attempts=attempts+1,first_attempt=coalesce(first_attempt,now()),next_attempt=now()+interval '2 minutes',sender=coalesce(sender,$1) FROM candidate WHERE m.id=candidate.id RETURNING m.*`,
    [process.env.EMAIL_FROM, feedbackId || null],
  );
  if (!mail) return;
  let state = "queued",
    receipt = null;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Idempotency-Key": "mid-feedback-" + mail.id,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        from: mail.sender,
        to: [mail.recipient],
        reply_to: "marcus@mysocialimpact.org",
        subject:
          mail.kind === "reply"
            ? "Your feedback on My Impact Director"
            : "New My Impact Director feedback",
        text: mail.body,
      }),
    });
    if (r.ok) {
      const body = await r.json();
      if (typeof body.id === "string" && body.id) {
        receipt = body.id;
        state = "accepted";
      }
    } else if (
      r.status >= 400 &&
      r.status < 500 &&
      ![408, 409, 425, 429].includes(r.status)
    )
      state = "failed";
  } catch {
    /* Retry the frozen message and key after a transport error. */
  }
  await query(
    `UPDATE director.feedback_mail SET state=$2,receipt=$3,accepted_at=CASE WHEN $2='accepted' THEN now() END,next_attempt=now()+make_interval(mins=>least(60,2*attempts)) WHERE id=$1 AND attempts=$4 AND state='sending'`,
    [mail.id, state, receipt, mail.attempts],
  );
}

// Provider acceptance and delivery are separate events. Poll tracked receipts using the existing transport.
export async function reconcileFeedbackMail() {
  if (!emailEnabled()) return;
  const [mail] = await query<{
    id: string;
    receipt: string;
  }>(`WITH candidate AS (SELECT id FROM director.feedback_mail WHERE state='accepted' AND receipt IS NOT NULL AND next_attempt<=now() AND accepted_at>now()-interval '3 days' ORDER BY next_attempt FOR UPDATE SKIP LOCKED LIMIT 1)
    UPDATE director.feedback_mail m SET next_attempt=now()+interval '1 hour' FROM candidate WHERE m.id=candidate.id RETURNING m.id,m.receipt`);
  if (!mail) return;
  try {
    const r = await fetch(
      "https://api.resend.com/emails/" + encodeURIComponent(mail.receipt),
      {
        headers: { authorization: "Bearer " + process.env.RESEND_API_KEY },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!r.ok) return;
    const event = (await r.json()).last_event;
    if (
      [
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "complained",
        "failed",
        "suppressed",
      ].includes(event)
    ) {
      const state = ["opened", "clicked"].includes(event) ? "delivered" : event;
      await query(
        "UPDATE director.feedback_mail SET state=$2 WHERE id=$1 AND state='accepted'",
        [mail.id, state],
      );
    }
  } catch {
    /* The accepted receipt remains available for the next reconciliation. */
  }
}
