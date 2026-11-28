import type { Identity } from "./auth";
import type { PoolClient } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { query, transaction } from "./db";
import { FOUNDER_OWNER, founderProof } from "./founder-policy";
import { AppError } from "./security";

/** Only call with server-verified ownership, never a submitted profile field. */
export async function resolveVerifiedAccount(
  c: PoolClient,
  email: string,
  name = "",
  method = "email",
  principal?: string,
) {
  email = email.trim().toLowerCase();
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    email,
  ]);
  const {
    rows: [linked],
  } = principal
    ? await c.query<{ owner_id: string }>(
        "SELECT owner_id FROM director.auth_principals WHERE auth_user_id=$1",
        [principal],
      )
    : await c.query<{ owner_id: string }>(
        `SELECT p.owner_id FROM director.auth_principals p JOIN director.auth_users u ON u.id=p.auth_user_id JOIN director.users root ON root.id=p.owner_id WHERE lower(u.email)=$1 AND u."emailVerified" AND root.retired_at IS NULL LIMIT 1`,
        [email],
      );
  const {
    rows: [existing],
  } = await c.query<{ id: string }>(
    "SELECT COALESCE(canonical_owner_id,id) AS id FROM director.users WHERE lower(email)=$1 AND email_verified_at IS NOT NULL AND NOT is_anonymous AND retired_at IS NULL ORDER BY created_at LIMIT 1",
    [email],
  );
  // Never adopt a merely claimed, unverified address. A verified provider ID
  // already linked by Better Auth remains stable, including Apple relay email.
  const id = founderProof(email, true)
    ? FOUNDER_OWNER
    : linked?.owner_id || existing?.id || "account_" + randomUUID();
  await c.query(
    `INSERT INTO director.users(id,email,name,email_verified_at,canonical_owner_id,account_class,last_auth_method,last_sign_in_at)
    VALUES($1,$2,$3,now(),$1,$4,$5,now()) ON CONFLICT(id) DO UPDATE SET
    last_seen=now(),retired_at=NULL,last_auth_method=$5,email_verified_at=COALESCE(director.users.email_verified_at,now()),
    name=CASE WHEN director.users.name='' THEN $3 ELSE director.users.name END`,
    [id, email, name, id === FOUNDER_OWNER ? "founder" : "customer", method],
  );
  if (principal)
    await c.query(
      "INSERT INTO director.auth_principals(auth_user_id,owner_id) VALUES($1,$2) ON CONFLICT(auth_user_id) DO UPDATE SET last_seen=now()",
      [principal, id],
    );
  await c.query(
    "UPDATE director.users SET canonical_owner_id=$1 WHERE lower(email)=$2 AND email_verified_at IS NOT NULL AND NOT is_anonymous AND retired_at IS NULL",
    [id, email],
  );
  return id;
}

export async function hydrateVerifiedIdentity(
  user: Identity,
): Promise<Identity> {
  if (user.anonymous) return { ...user, founder: false };
  const [state] = await query<{
    canonical_owner_id: string | null;
    retired_at: string | null;
  }>("SELECT canonical_owner_id,retired_at FROM director.users WHERE id=$1", [
    user.id,
  ]);
  if (state?.retired_at)
    throw new AppError(
      401,
      "This old test sign-in has been retired. Continue with your verified account.",
    );
  if (!user.emailVerified) return { ...user, founder: false };
  const owner = await transaction((c) =>
    resolveVerifiedAccount(
      c,
      user.email,
      user.name,
      user.passwordAccount
        ? "legacy password"
        : user.authMethods?.join(", ") || "email",
    ),
  );
  const aliases = await query<{ id: string }>(
    "SELECT id FROM director.users WHERE id=$1 OR canonical_owner_id=$1",
    [owner],
  );
  return {
    ...user,
    id: owner,
    founder: owner === FOUNDER_OWNER,
    accessIds: [
      ...new Set([
        owner,
        ...aliases.map((x) => x.id),
        ...(user.accessIds || []),
      ]),
    ],
  };
}
