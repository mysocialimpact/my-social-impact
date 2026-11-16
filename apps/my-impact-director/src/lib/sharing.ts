import { randomBytes } from "node:crypto";
import { tokenHash } from "./access";
import { query } from "./db";
import type { Identity } from "./auth";
import { getReview, reviewAccess } from "./reviews";
import { AppError } from "./security";
export async function shareable(user: Identity, id: string) {
  if (!user.emailVerified)
    throw new AppError(403, "Confirm your account email before sharing.");
  const review = await getReview(user, id);
  if (!(await reviewAccess(user, review)))
    throw new AppError(
      403,
      "This detailed assessment is not available to this account.",
    );
  if (
    review.status !== "complete" ||
    !review.result ||
    review.framework === "document"
  )
    throw new AppError(409, "Only a completed assessment can be shared.");
  return review;
}
export async function createShare(user: Identity, id: string) {
  await shareable(user, id);
  const token = randomBytes(32).toString("base64url");
  const [share] = await query<{ id: string; expires_at: string }>(
    "INSERT INTO director.assessment_shares(review_id,owner_id,token_hash) VALUES($1,$2,$3) RETURNING id,expires_at",
    [id, user.id, tokenHash(token)],
  );
  return { ...share, url: `${process.env.APP_ORIGIN}/shared#${token}` };
}
export async function readShare(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError(404, "This shared assessment is unavailable.");
  const [row] = await query(
    "SELECT r.title,v.result FROM director.assessment_shares s JOIN director.reviews v ON v.id=s.review_id JOIN director.reports r ON r.id=v.report_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND r.expires_at>now() AND v.status='complete' AND v.result IS NOT NULL",
    [tokenHash(token)],
  );
  if (!row)
    throw new AppError(404, "This share link has expired or been revoked.");
  return row;
}
