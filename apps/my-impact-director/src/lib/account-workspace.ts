import type { Identity } from "./auth";
import { transaction } from "./db";

// Called only after authenticated email proof, or for a verified password
// account adopting a guest session that this browser independently owns.
// Grant access without subscribing/resending historical report emails.
export async function connectVerifiedWorkspace(
  user: Identity,
  proofIds: string[],
) {
  if (!proofIds.length) return;
  await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      user.id,
    ]);
    await c.query(
      "UPDATE director.users SET email_verified_at=COALESCE(email_verified_at,now()) WHERE id=$1",
      [user.id],
    );
    await c.query(
      `INSERT INTO director.review_grants(review_id,owner_id)
      SELECT DISTINCT v.id,$1 FROM director.reviews v JOIN director.reports r ON r.id=v.report_id
      WHERE r.expires_at>now() AND (v.framework='document' OR v.framework IS NULL)
      AND (r.owner_id=ANY($2::text[]) OR EXISTS(SELECT 1 FROM director.review_grants g JOIN director.reviews gv ON gv.id=g.review_id WHERE gv.report_id=r.id AND g.owner_id=ANY($2::text[])))
      ON CONFLICT DO NOTHING`,
      [user.id, proofIds],
    );
    await c.query(
      `UPDATE director.reports r SET expires_at=GREATEST(expires_at,now()+interval '180 days')
      WHERE EXISTS(SELECT 1 FROM director.review_grants g JOIN director.reviews v ON v.id=g.review_id WHERE v.report_id=r.id AND g.owner_id=$1)`,
      [user.id],
    );
  });
}
