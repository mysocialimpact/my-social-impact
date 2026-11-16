import { query, transaction } from "./db";
import { accessToken, tokenHash } from "./access";
import type { Identity } from "./auth";
import { grantVerifiedReport } from "./email-save";
export async function adoptCurrentReports(req: Request, user: Identity) {
  if (!user.emailVerified || !user.email) return;
  const guest = accessToken(req);
  const guestOwners = guest
    ? await query<{ owner_id: string }>(
        "SELECT owner_id FROM director.access_sessions WHERE token_hash=$1 AND kind='guest' AND expires_at>now()",
        [tokenHash(guest)],
      )
    : [];
  const ids = [user.id, ...guestOwners.map((x) => x.owner_id)];
  await transaction(async (c) => {
    const { rows } = await c.query<{ id: string }>(
      "SELECT v.id FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE r.owner_id=ANY($1::text[]) AND r.expires_at>now() AND (v.framework='document' OR v.framework IS NULL)",
      [ids],
    );
    for (const row of rows)
      await grantVerifiedReport(c, row.id, user.id, user.email);
  });
}
