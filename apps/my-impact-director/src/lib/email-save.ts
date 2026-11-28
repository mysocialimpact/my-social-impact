import { resolveVerifiedAccount } from "./verified-account";
import { safeReturnPath } from "./return-path";
import type { PoolClient } from "@neondatabase/serverless";
import { localIdentity, localGuest } from "./access";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "./db";
import { visitor, identity, sessionCookie } from "./auth";
import { AppError, rateLimit } from "./security";
import {
  accessCookie,
  EMAIL_COOKIE,
  metric,
  privateNetworkKey,
  tokenHash,
} from "./access";
import { getReview } from "./reviews";

export const emailEnabled = () =>
  process.env.EMAIL_ENABLED === "true" &&
  !!process.env.RESEND_API_KEY &&
  !!process.env.EMAIL_FROM;
const emailId = (email: string) =>
  "email_" + createHash("sha256").update(email).digest("hex");
const inputSchema = z
  .object({
    email: z.email().max(254),
    reviewId: z.uuid().optional(),
    account: z.boolean().optional(),
    next: z.string().max(500).optional(),
  })
  .strict();
export async function requestEmailSave(req: Request, input: unknown) {
  if (!emailEnabled())
    throw new AppError(
      503,
      "We’re sorry — email delivery is temporarily unavailable. Your headline results remain here. Please try again later or tell us through Help us make this better.",
      "EMAIL_UNAVAILABLE",
    );
  const { email: rawEmail, reviewId, account, next } = inputSchema.parse(input),
    email = rawEmail.trim().toLowerCase();

  let ownerId = emailId(email);
  if (reviewId) {
    const user = await visitor(req),
      review = await getReview(user, reviewId);
    if (!review.framework && (review.status !== "complete" || !review.result))
      throw new AppError(
        409,
        "Your review needs to finish before it can be emailed.",
      );
    await rateLimit(`email-save:${user.id}`, 5, 86400);
    ownerId = (await localGuest(req))?.id || user.id;
    const verified = user.emailVerified ? user : await localIdentity(req);
    if (
      verified?.emailVerified &&
      !verified.anonymous &&
      verified.email.toLowerCase() === email
    ) {
      await transaction((c) =>
        grantVerifiedReport(c, reviewId, verified.id, email),
      );
      await metric("email_requested");
      return { verified: true };
    }
  } else {
    if (account) {
      const current = await visitor(req);
      const verified = current.emailVerified
        ? current
        : await localIdentity(req);
      if (
        verified?.emailVerified &&
        !verified.anonymous &&
        verified.email.toLowerCase() === email
      )
        return { verified: true };
      ownerId = (await localGuest(req))?.id || current.id;
    } else {
      const existing = await query(
        "SELECT id FROM director.users WHERE lower(email)=$1 AND is_anonymous=false LIMIT 1",
        [email],
      );
      if (!existing.length) return;
      ownerId = String(existing[0].id);
    }
  }
  // Verification already held by this session must not consume another
  // delivery allowance. Shared office networks also need room for new users.
  await rateLimit(`email-ip:${privateNetworkKey(req)}`, 60, 3600);
  await rateLimit(`email-recipient:${email}`, 6, 3600);
  const token = randomBytes(32).toString("base64url"),
    hash = tokenHash(token);
  await query(
    "INSERT INTO director.email_links(token_hash,owner_id,review_id,email,expires_at,return_path) VALUES($1,$2,$3,$4,now()+interval '30 minutes',$5)",
    [hash, ownerId, reviewId || null, email, safeReturnPath(next)],
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
          : "Your My Impact Director sign-in link",
        text: `${reviewId ? "Confirm your email to receive a private link to your digital report:" : "Open this private link to return to your saved reviews:"}\n\n${destination.href}\n\nThis single-use link expires in 30 minutes. You have not been subscribed to marketing.`,
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
export async function redeemEmailLink(token: string, req?: Request) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError(400, "This link is invalid or expired.");
  let passwordIdentity: Awaited<ReturnType<typeof identity>> | null = null;
  if (req && sessionCookie(req)) {
    try {
      passwordIdentity = await identity(req);
    } catch (e) {
      if (!(e instanceof AppError && e.status === 401)) throw e;
    }
  }
  const session = randomBytes(32).toString("base64url");
  const destination = await transaction(async (c) => {
    const {
      rows: [link],
    } = await c.query<{
      email: string;
      review_id: string | null;
      owner_id: string;
      return_path: string;
    }>(
      "SELECT email,review_id,owner_id,return_path FROM director.email_links WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
      [tokenHash(token)],
    );
    if (!link)
      throw new AppError(
        410,
        "This link has expired or has already been used. Log in, or request a recovery link from the login page.",
      );
    if (
      passwordIdentity?.passwordAccount &&
      passwordIdentity.email.toLowerCase() === link.email
    )
      await c.query(
        "UPDATE director.users SET email_verified_at=now() WHERE id=$1 AND lower(email)=$2 AND retired_at IS NULL",
        [passwordIdentity.id, link.email],
      );
    const id = await resolveVerifiedAccount(
      c,
      link.email,
      passwordIdentity?.email.toLowerCase() === link.email
        ? passwordIdentity.name
        : "",
      "email",
    );
    await c.query(
      "UPDATE director.users SET last_sign_in_at=now() WHERE id=$1",
      [id],
    );
    await c.query(
      "INSERT INTO director.audit(actor_id,action,resource_id,event_key,metadata) VALUES($1,'account-signed-in',$1,$2,'{\"method\":\"email\"}') ON CONFLICT(event_key) DO NOTHING",
      [id, `email-signin:${tokenHash(token)}`],
    );
    if (link.review_id)
      await grantVerifiedReport(c, link.review_id, id, link.email);
    // The email proves the account; the captured authenticated guest session proves its documents.
    // Never subscribe other existing accounts' historical documents merely because they share an email.
    // Report-delivery links grant their selected report. Account/recovery
    // links without a review ID can adopt the captured guest workspace.
    if (!link.review_id) {
      const { rows: guestReports } = await c.query<{ id: string }>(
        "SELECT v.id FROM director.reviews v JOIN director.reports r ON r.id=v.report_id JOIN director.users u ON u.id=r.owner_id WHERE r.owner_id=$1 AND u.is_anonymous AND r.expires_at>now() AND (v.framework='document' OR v.framework IS NULL)",
        [link.owner_id],
      );
      for (const row of guestReports)
        await grantVerifiedReport(c, row.id, id, link.email);
    }
    const { rows: priorReports } = await c.query<{ id: string }>(
      `WITH verified_owners AS (SELECT id FROM director.users WHERE lower(email)=$1 AND NOT is_anonymous AND email_verified_at IS NOT NULL)
       SELECT DISTINCT v.id FROM director.reviews v JOIN director.reports r ON r.id=v.report_id
       WHERE r.expires_at>now() AND (v.framework='document' OR v.framework IS NULL)
       AND (r.owner_id IN(SELECT id FROM verified_owners) OR EXISTS(
         SELECT 1 FROM director.review_grants g JOIN director.reviews gv ON gv.id=g.review_id
         WHERE gv.report_id=r.id AND g.owner_id IN(SELECT id FROM verified_owners)))`,
      [link.email],
    );
    for (const row of priorReports)
      await grantVerifiedReport(c, row.id, id, link.email, false);
    await c.query(
      "UPDATE director.email_links SET used_at=now() WHERE token_hash=$1",
      [tokenHash(token)],
    );
    await c.query(
      "INSERT INTO director.access_sessions(token_hash,owner_id,kind,expires_at,verified_email) VALUES($1,$2,'email',now()+interval '30 days',$3)",
      [tokenHash(session), id, link.email],
    );
    await c.query(
      "INSERT INTO director.daily_metrics(event,count) VALUES('email_saved',1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
    );
    return link.review_id
      ? `/reviews/${link.review_id}`
      : safeReturnPath(link.return_path);
  });
  return {
    destination,
    cookie: accessCookie(session, 30 * 86400, EMAIL_COOKIE),
  };
}

async function grantVerifiedReport(
  c: PoolClient,
  reviewId: string,
  id: string,
  email: string,
  subscribe = true,
) {
  {
    const { rowCount } = await c.query(
      "SELECT v.id FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE v.id=$1 AND r.expires_at>now() ",
      [reviewId],
    );
    if (!rowCount)
      throw new AppError(410, "This review has expired or was deleted.");
    await c.query(
      "INSERT INTO director.review_grants(review_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [reviewId, id],
    );
    await c.query(
      "UPDATE director.reports r SET expires_at=GREATEST(expires_at,now()+interval '180 days') FROM director.reviews v WHERE v.report_id=r.id AND v.id=$1",
      [reviewId],
    );
  }
  if (subscribe) {
    await c.query(
      "INSERT INTO director.report_subscriptions(report_id,owner_id,email) SELECT report_id,$2,$3 FROM director.reviews v WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM director.report_subscriptions s WHERE s.report_id=v.report_id AND lower(s.email)=lower($3)) ON CONFLICT DO NOTHING",
      [reviewId, id, email],
    );
    await c.query(
      "INSERT INTO director.report_deliveries(review_id,owner_id,email) SELECT v.id,$2,$3 FROM director.reviews v WHERE v.report_id=(SELECT report_id FROM director.reviews WHERE id=$1) AND (v.framework IN ('claims','excellence','report') OR v.id=$1) AND v.status='complete' AND v.framework IS DISTINCT FROM 'document' AND jsonb_typeof(v.result)='object' AND NOT EXISTS(SELECT 1 FROM director.report_deliveries d WHERE d.review_id=v.id AND lower(d.email)=lower($3)) ON CONFLICT DO NOTHING",
      [reviewId, id, email],
    );
  }
}
