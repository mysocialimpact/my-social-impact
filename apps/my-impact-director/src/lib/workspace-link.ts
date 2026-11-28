import { randomBytes } from "node:crypto";
import type { Identity } from "./auth";
import { transaction } from "./db";
import { accessCookie, accessToken, tokenHash } from "./access";
import { hydrateVerifiedIdentity } from "./verified-account";
import { AppError } from "./security";
import { FOUNDER_OWNER } from "./founder-policy";
export const WORKSPACE_COOKIE = "mid_workspace_link";
export async function prepareWorkspaceLink(user: Identity) {
  if (user.anonymous)
    throw new AppError(
      401,
      "Sign in to the workspace you want to connect first.",
    );
  const token = randomBytes(32).toString("base64url");
  await transaction(async (c) => {
    await c.query(
      "INSERT INTO director.workspace_link_proofs(token_hash,owner_id,expires_at,founder_authority) VALUES($1,$2,now()+interval '15 minutes',$3)",
      [
        tokenHash(token),
        user.id,
        user.id === FOUNDER_OWNER &&
          user.founder &&
          user.emailVerified === true,
      ],
    );
  });
  return accessCookie(token, 900, WORKSPACE_COOKIE);
}
export async function connectOwnedWorkspace(req: Request, user: Identity) {
  const token = accessToken(req, WORKSPACE_COOKIE);
  if (!token || !user.emailVerified || user.anonymous) return user;
  const targetOwner = await transaction(async (c) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('mid:workspace-link',0))",
    );
    const {
      rows: [proof],
    } = await c.query<{ owner_id: string; founder_authority: boolean }>(
      "SELECT owner_id,founder_authority FROM director.workspace_link_proofs WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
      [tokenHash(token)],
    );
    if (!proof) return user.id;
    const {
      rows: [source],
    } = await c.query<{ canonical_owner_id: string | null }>(
      "SELECT canonical_owner_id FROM director.users WHERE id=$1",
      [proof.owner_id],
    );
    const founderSource = proof.founder_authority;
    if (
      !founderSource &&
      (proof.owner_id === FOUNDER_OWNER ||
        source?.canonical_owner_id === FOUNDER_OWNER)
    )
      throw new AppError(
        409,
        "This workspace has already changed. Sign in to your verified account and connect it again.",
      );
    // The one-time proof was created only by an authenticated, explicit
    // "connect this workspace" action. It independently proves ownership of
    // the old Founder workspace, so Apple relay emails can link safely.
    const target = founderSource ? FOUNDER_OWNER : user.id;
    const from = founderSource ? user.id : proof.owner_id;
    await c.query(
      `INSERT INTO director.review_grants(review_id,owner_id) SELECT DISTINCT v.id,$1 FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE r.expires_at>now() AND (v.framework='document' OR v.framework IS NULL) AND (r.owner_id=$2 OR EXISTS(SELECT 1 FROM director.review_grants g JOIN director.reviews gv ON gv.id=g.review_id WHERE gv.report_id=r.id AND g.owner_id=$2)) ON CONFLICT DO NOTHING`,
      [target, from],
    );
    if (from !== target) {
      await c.query(
        "UPDATE director.users SET canonical_owner_id=$1,retired_at=now() WHERE id=$2",
        [target, from],
      );
      await c.query("DELETE FROM director.access_sessions WHERE owner_id=$1", [
        from,
      ]);
    }
    await c.query(
      "UPDATE director.auth_principals SET owner_id=$1 WHERE owner_id=$2",
      [target, from],
    );
    await c.query(
      "UPDATE director.users SET canonical_owner_id=$1 WHERE canonical_owner_id=$2 AND id<>$1",
      [target, from],
    );
    await c.query(
      "UPDATE director.workspace_link_proofs SET used_at=COALESCE(used_at,now()) WHERE token_hash=$1 OR owner_id=$2",
      [tokenHash(token), proof.owner_id],
    );
    await c.query(
      "INSERT INTO director.audit(actor_id,action,resource_id,event_key,metadata) VALUES($1,'workspace-connected',$2,$3,'{}') ON CONFLICT(event_key) DO NOTHING",
      [target, from, `workspace-link:${tokenHash(token)}`],
    );
    return target;
  });
  return targetOwner === user.id
    ? user
    : hydrateVerifiedIdentity({ ...user, id: targetOwner, accessIds: [] });
}
