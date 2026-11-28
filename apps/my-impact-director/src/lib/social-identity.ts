import { getSocialAuth, hasSocialCookie } from "./social-auth";
import { query, transaction } from "./db";
import {
  resolveVerifiedAccount,
  hydrateVerifiedIdentity,
} from "./verified-account";
import { accountEvent } from "./account-events";
import { AppError } from "./security";
import type { Identity } from "./auth";

export async function socialIdentity(req: Request): Promise<Identity | null> {
  if (!hasSocialCookie(req) || !process.env.AUTH_SECRET) return null;
  const auth = await getSocialAuth(req);
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return null;
  if (!session.user.emailVerified)
    throw new AppError(
      401,
      "Your sign-in provider has not confirmed your email address. Please continue with an email sign-in link.",
    );
  const providers = await query<{ providerId: string }>(
    `SELECT DISTINCT "providerId" FROM director.auth_accounts WHERE "userId"=$1`,
    [session.user.id],
  );
  const method = providers.map((x) => x.providerId).join(", ") || "social";
  const id = await transaction((c) =>
    resolveVerifiedAccount(
      c,
      session.user.email,
      session.user.name,
      method,
      session.user.id,
    ),
  );
  const key = `social-signin:${session.session.id}`;
  await accountEvent(id, "account-signed-in", id, key, { method });
  await query(
    "UPDATE director.users SET last_sign_in_at=GREATEST(COALESCE(last_sign_in_at,'1970-01-01'),$2::timestamptz) WHERE id=$1",
    [id, session.session.createdAt],
  );
  return hydrateVerifiedIdentity({
    id,
    email: session.user.email,
    name: session.user.name,
    founder: false,
    emailVerified: true,
    authMethods: providers.map((x) => x.providerId),
    socialAccount: true,
  });
}
