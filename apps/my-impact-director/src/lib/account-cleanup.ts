import { query, transaction } from "./db";
import { classifyAccount } from "./founder-policy";
export async function auditAccounts() {
  const rows = await query<{
    id: string;
    email: string;
    name: string;
    is_anonymous: boolean;
    retired_at: string | null;
    payments: number;
    enquiries: number;
    reports: number;
  }>(
    `SELECT u.id,u.email,u.name,u.is_anonymous,u.retired_at,(SELECT count(*) FROM director.contributions c WHERE c.owner_id=u.id)::int AS payments,(SELECT count(*) FROM director.enquiries e WHERE e.owner_id=u.id)::int AS enquiries,(SELECT count(*) FROM director.reports r WHERE r.owner_id=u.id)::int AS reports FROM director.users u WHERE NOT is_anonymous ORDER BY created_at`,
  );
  return rows.map((u) => ({
    ...u,
    ...classifyAccount(u),
    retire: classifyAccount(u).retire && !u.payments && !u.enquiries,
  }));
}
/** Reversible archive only. Never remove reports, accounts, payments or audit. */
export async function archiveKnownTest(id: string, actor: string) {
  return transaction(async (c) => {
    const {
      rows: [user],
    } = await c.query<{
      id: string;
      email: string;
      account_class: string;
      retired_at: string | null;
      canonical_owner_id: string | null;
    }>(
      "SELECT id,email,account_class,retired_at,canonical_owner_id FROM director.users WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!user || user.retired_at || !classifyAccount(user).retire) return false;
    const {
      rows: [held],
    } = await c.query(
      "SELECT EXISTS(SELECT 1 FROM director.contributions WHERE owner_id=$1) OR EXISTS(SELECT 1 FROM director.enquiries WHERE owner_id=$1) AS preserve",
      [id],
    );
    if (held.preserve) return false;
    await c.query(
      "UPDATE director.users SET account_class='test',classification_reason=$2,retired_at=now() WHERE id=$1",
      [id, classifyAccount(user).reason],
    );
    await c.query(
      "UPDATE director.access_sessions SET expires_at=LEAST(expires_at,now()) WHERE owner_id=$1",
      [id],
    );
    await c.query(
      `UPDATE director.auth_sessions SET "expiresAt"=LEAST("expiresAt",now()) WHERE "userId" IN(SELECT auth_user_id FROM director.auth_principals WHERE owner_id=$1)`,
      [id],
    );
    await c.query(
      "INSERT INTO director.audit(actor_id,action,resource_id,event_key,metadata) VALUES($1,'test-account-archived',$2,$3,$4) ON CONFLICT(event_key) DO NOTHING",
      [
        actor,
        id,
        `archive-test:${id}`,
        JSON.stringify({
          previousClass: user.account_class,
          previousRetiredAt: user.retired_at,
          reason: classifyAccount(user).reason,
          reviewDataPreserved: true,
        }),
      ],
    );
    return true;
  });
}
