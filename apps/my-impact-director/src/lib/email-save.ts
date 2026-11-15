import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "./db";
import { visitor } from "./auth";
import { AppError, rateLimit } from "./security";
import {
  accessCookie,
  EMAIL_COOKIE,
  metric,
  privateNetworkKey,
  tokenHash,
} from "./access";
import { getReview } from "./reviews";
import { exportPdf } from "./export";
import type { ReviewResult } from "./pipeline";

export const emailEnabled = () =>
  process.env.EMAIL_ENABLED === "true" &&
  !!process.env.RESEND_API_KEY &&
  !!process.env.EMAIL_FROM;
const emailId = (email: string) =>
  "email_" + createHash("sha256").update(email).digest("hex");
const inputSchema = z
  .object({ email: z.email().max(254), reviewId: z.uuid().optional() })
  .strict();
export async function requestEmailSave(req: Request, input: unknown) {
  if (!emailEnabled())
    throw new AppError(
      503,
      "We’re sorry — email delivery is temporarily unavailable. Your headline results remain here. Please try again later or tell us through Help us make this better.",
      "EMAIL_UNAVAILABLE",
    );
  const { email: rawEmail, reviewId } = inputSchema.parse(input),
    email = rawEmail.trim().toLowerCase();
  await rateLimit(`email-ip:${privateNetworkKey(req)}`, 8, 3600);
  await rateLimit(`email-recipient:${email}`, 3, 3600);
  let ownerId = emailId(email),
    attachment: Buffer | undefined;
  if (reviewId) {
    const user = await visitor(req),
      review = await getReview(user, reviewId);
    if (!review.framework && (review.status !== "complete" || !review.result))
      throw new AppError(
        409,
        "Your review needs to finish before it can be emailed.",
      );
    await rateLimit(`email-save:${user.id}`, 5, 86400);
    ownerId = user.id;
  } else {
    const existing = await query(
      "SELECT id FROM director.users WHERE id=$1 AND is_anonymous=false",
      [ownerId],
    );
    if (!existing.length) return;
  }
  const token = randomBytes(32).toString("base64url"),
    hash = tokenHash(token);
  await query(
    "INSERT INTO director.email_links(token_hash,owner_id,review_id,email,expires_at) VALUES($1,$2,$3,$4,now()+interval '30 minutes')",
    [hash, ownerId, reviewId || null, email],
  );
  const origin =
    process.env.APP_ORIGIN ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const destination = new URL("/access", origin);
  destination.hash = token;
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "idempotency-key": `mid-save-${hash}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email],
        reply_to: "marcus@mysocialimpact.org",
        subject: reviewId
          ? "Confirm your email for your free detailed review"
          : "Return to your saved impact reviews",
        text: `${reviewId ? (attachment ? "Your full impact report review is attached. Open this private link to keep it in your saved reviews for 180 days:" : "Confirm your email to receive your free detailed report when it is ready:") : "Open this private link to return to your saved reviews:"}\n\n${destination.href}\n\nThis single-use link expires in 30 minutes. You have not been subscribed to marketing. If you did not request this email, you can ignore it.`,
        ...(attachment
          ? {
              attachments: [
                {
                  filename: "my-impact-director-review.pdf",
                  content: attachment.toString("base64"),
                },
              ],
            }
          : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AppError(
      503,
      "We’re sorry — we couldn’t confirm email delivery. Your review is still here. Please try again or tell us through Help us make this better.",
    );
  }
  if (!response.ok) {
    await query("DELETE FROM director.email_links WHERE token_hash=$1", [hash]);
    throw new AppError(
      503,
      "The email service could not accept this message. Your review is still available here.",
    );
  }
  const receipt = await response.json();
  await query(
    "UPDATE director.email_links SET delivery_id=$2 WHERE token_hash=$1",
    [hash, String(receipt.id || "")],
  );
  await metric("email_requested");
}
export async function redeemEmailLink(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError(400, "This link is invalid or expired.");
  const session = randomBytes(32).toString("base64url");
  const destination = await transaction(async (c) => {
    const {
      rows: [link],
    } = await c.query<{
      email: string;
      review_id: string | null;
      owner_id: string;
    }>(
      "SELECT email,review_id,owner_id FROM director.email_links WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
      [tokenHash(token)],
    );
    if (!link)
      throw new AppError(
        410,
        "This link has expired or has already been used. Request a fresh email from Saved reviews.",
      );
    const id = emailId(link.email);
    await c.query(
      "INSERT INTO director.users(id,email,name) VALUES($1,$2,'') ON CONFLICT(id) DO UPDATE SET last_seen=now()",
      [id, link.email],
    );
    if (link.review_id) {
      const { rowCount } = await c.query(
        "SELECT v.id FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE v.id=$1 AND r.expires_at>now() ",
        [link.review_id],
      );
      if (!rowCount)
        throw new AppError(410, "This review has expired or was deleted.");
      await c.query(
        "INSERT INTO director.review_grants(review_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [link.review_id, id],
      );
      await c.query(
        "UPDATE director.reports r SET expires_at=GREATEST(expires_at,now()+interval '180 days') FROM director.reviews v WHERE v.report_id=r.id AND v.id=$1",
        [link.review_id],
      );
    }
    if (link.review_id) {
      await c.query(
        "INSERT INTO director.report_subscriptions(report_id,owner_id,email) SELECT report_id,$2,$3 FROM director.reviews WHERE id=$1 ON CONFLICT DO NOTHING",
        [link.review_id, id, link.email],
      );
      await c.query(
        "INSERT INTO director.report_deliveries(review_id,owner_id,email) SELECT v.id,$2,$3 FROM director.reviews v WHERE v.report_id=(SELECT report_id FROM director.reviews WHERE id=$1) AND (v.framework IN ('claims','excellence') OR v.id=$1) AND v.status='complete' AND v.result IS NOT NULL ON CONFLICT DO NOTHING",
        [link.review_id, id, link.email],
      );
    }
    await c.query(
      "UPDATE director.email_links SET used_at=now() WHERE token_hash=$1",
      [tokenHash(token)],
    );
    await c.query(
      "INSERT INTO director.access_sessions(token_hash,owner_id,kind,expires_at) VALUES($1,$2,'email',now()+interval '30 days')",
      [tokenHash(session), id],
    );
    await c.query(
      "INSERT INTO director.daily_metrics(event,count) VALUES('email_saved',1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
    );
    return link.review_id ? `/reviews/${link.review_id}` : "/reviews";
  });
  return {
    destination,
    cookie: accessCookie(session, 30 * 86400, EMAIL_COOKIE),
  };
}
