import { z } from "zod";
import {
  localIdentity,
  clearLocalSession,
  accessToken,
  tokenHash,
} from "./access";
import { query, transaction } from "./db";
import { AppError, rateLimit, sameOrigin } from "./security";
const identitySchema = z.object({
  signedIn: z.literal(true),
  account: z.object({
    id: z.string().min(1),
    email: z.email(),
    name: z.string(),
    organisation: z.string().optional(),
  }),
  platformAccess: z.object({ founder: z.boolean().optional() }).optional(),
});
export type Identity = {
  id: string;
  email: string;
  name: string;
  organisation?: string;
  founder: boolean;
  anonymous?: boolean;
  emailVerified?: boolean;
  accessIds?: string[];
  authSubject?: string;
  passwordAccount?: boolean;
};
const accountUrl = () =>
  new URL(
    "/api/readiness-account",
    process.env.ACCOUNT_ORIGIN || "https://mysocialimpact.org",
  );
export function sessionCookie(req: Request) {
  return (
    (req.headers.get("cookie") || "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("msi_sorp_session=")) || ""
  );
}
export async function identity(req: Request): Promise<Identity> {
  const cookie = sessionCookie(req);
  if (!cookie) {
    const local = await localIdentity(req);
    if (local) return local;
    throw new AppError(
      401,
      "Open your saved email link or sign in to continue.",
    );
  }
  const r = await fetch(accountUrl(), {
    headers: { cookie, "x-sorp-destination": "sorp2026.org" },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok)
    throw new AppError(
      r.status === 401 ? 401 : 503,
      "Your account could not be verified. Please sign in again.",
    );
  const parsed = identitySchema.safeParse(await r.json());
  if (!parsed.success) throw new AppError(401, "Please sign in again.");
  const user = {
    ...parsed.data.account,
    founder: parsed.data.platformAccess?.founder === true,
  };
  const email = user.email.trim().toLowerCase();
  const local = await localIdentity(req);
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "subject:" + user.id,
    ]);
    // New unverified provider accounts get a private placeholder, never another
    // person's saved workspace based solely on a matching email string.
    await c.query(
      "INSERT INTO director.users(id,email,name,is_anonymous) VALUES($1,'',$2,true) ON CONFLICT(id) DO NOTHING",
      [user.id, user.name],
    );
    await c.query(
      "INSERT INTO director.account_identities(subject,owner_id,email) VALUES($1,$1,$2) ON CONFLICT(subject) DO UPDATE SET last_seen=now()",
      [user.id, email],
    );
    let {
      rows: [binding],
    } = await c.query<{
      owner_id: string;
      email: string;
      verified_at: Date | null;
    }>(
      "SELECT owner_id,email,verified_at FROM director.account_identities WHERE subject=$1 FOR UPDATE",
      [user.id],
    );
    if (binding.email !== email)
      throw new AppError(
        401,
        "Your account address has changed. Please contact us to reconnect your reports.",
      );
    // Possession of both live sessions is valid ownership proof for migration.
    if (
      !binding.verified_at &&
      local &&
      !local.anonymous &&
      local.email.toLowerCase() === email
    ) {
      await c.query(
        "UPDATE director.account_identities SET owner_id=$2,verified_at=now() WHERE subject=$1",
        [user.id, local.id],
      );
      binding = { ...binding, owner_id: local.id, verified_at: new Date() };
    }
    await c.query("UPDATE director.users SET last_seen=now() WHERE id=$1", [
      binding.owner_id,
    ]);
    return {
      ...user,
      id: binding.owner_id,
      email,
      anonymous: false,
      emailVerified: !!binding.verified_at,
      authSubject: user.id,
      passwordAccount: true,
      accessIds: [binding.owner_id],
    };
  });
}
export async function visitor(req: Request): Promise<Identity> {
  let user: Identity | null = null;
  if (sessionCookie(req)) {
    try {
      user = await identity(req);
    } catch (e) {
      if (!(e instanceof AppError && e.status === 401)) throw e;
    }
  }
  const local = await localIdentity(req, true);
  if (user) {
    const guest = accessToken(req);
    const authorisedGuest = guest
      ? await query<{ owner_id: string }>(
          "SELECT owner_id FROM director.access_sessions WHERE token_hash=$1 AND kind='guest' AND expires_at>now()",
          [tokenHash(guest)],
        )
      : [];
    return {
      ...user,
      accessIds: [user.id, ...authorisedGuest.map((x) => x.owner_id)],
    };
  }
  if (local) return local;
  throw new AppError(
    401,
    "Log in to open your saved reports, or return in the browser where you started.",
    "ACCESS_REQUIRED",
  );
}

export async function founder(req: Request) {
  const u = await identity(req);
  if (!u.founder) throw new AppError(403, "Founder access is required.");
  return u;
}
export async function accountAction(req: Request, input: unknown) {
  sameOrigin(req);
  const data = z
    .object({
      action: z.enum([
        "login",
        "signup",
        "logout",
        "request-reset",
        "reset-password",
      ]),
      email: z.email().max(254).optional(),
      password: z.string().max(200).optional(),
      token: z.string().max(2000).optional(),
      marketing: z.boolean().optional(),
    })
    .strict()
    .parse(input);
  if (data.email) data.email = data.email.trim().toLowerCase();
  if (data.action !== "logout") {
    await rateLimit(
      `auth-ip:${req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"}`,
      30,
      900,
    );
    await rateLimit(`auth-email:${data.email || "reset"}`, 10, 900);
  }
  if (
    ["login", "signup"].includes(data.action) &&
    (!data.email || !data.password)
  )
    throw new AppError(400, "Enter your email and password.");
  if (
    ["signup", "reset-password"].includes(data.action) &&
    (data.password?.length || 0) < 10
  )
    throw new AppError(400, "Use a password of at least ten characters.");
  if (data.action === "request-reset" && !data.email)
    throw new AppError(400, "Enter your email address.");
  if (data.action === "reset-password" && !data.token)
    throw new AppError(400, "Open the complete reset link from your email.");
  if (data.action === "logout" && !sessionCookie(req)) {
    const headers = new Headers({ "cache-control": "no-store" });
    for (const cookie of await clearLocalSession(req))
      headers.append("set-cookie", cookie);
    return Response.json({ ok: true }, { headers });
  }
  // Password hashing, password reset and session issuance remain at the
  // established My Social Impact identity provider. This app stores no password.
  const body =
    data.action === "signup"
      ? {
          action: "signup",
          email: data.email,
          password: data.password,
          name: data.email!.split("@")[0].padEnd(2, "_"),
          position: "Not supplied",
          organisation: "Not supplied",
        }
      : data.action === "request-reset"
        ? { action: data.action, email: data.email }
        : data.action === "reset-password"
          ? { action: data.action, token: data.token, password: data.password }
          : { action: data.action, email: data.email, password: data.password };
  const r = await fetch(accountUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie(req),
      "x-sorp-destination": "sorp2026.org",
    },
    body: JSON.stringify(body),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const payload = await r
    .json()
    .catch(() => ({ error: "The account service is unavailable." }));
  const headers = new Headers({ "cache-control": "no-store" });
  let providerCookie = "";
  for (const cookie of r.headers.getSetCookie())
    if (cookie.startsWith("msi_sorp_session=")) {
      headers.append("set-cookie", cookie);
      providerCookie = cookie.split(";")[0];
    }
  if (data.action === "logout")
    for (const cookie of await clearLocalSession(req))
      headers.append("set-cookie", cookie);
  if (!r.ok)
    return Response.json(
      {
        error:
          typeof payload.error === "string"
            ? payload.error
            : "Sign-in could not be completed.",
      },
      { status: r.status, headers },
    );
  if ((data.action === "signup" || data.action === "login") && providerCookie) {
    const authorised = new Request(req.url, {
      headers: {
        cookie: [
          providerCookie,
          req.headers
            .get("cookie")
            ?.split(";")
            .filter((x) => !x.trim().startsWith("msi_sorp_session="))
            .join(";"),
        ]
          .filter(Boolean)
          .join(";"),
        "x-forwarded-for": req.headers.get("x-forwarded-for") || "unknown",
      },
    });
    const user = await visitor(authorised);
    if (data.action === "signup") {
      const { recordConsent } = await import("./preferences");
      await recordConsent(user.id, data.marketing === true, "registration");
    }
    if (user.emailVerified) {
      const { adoptCurrentReports } = await import("./account-workspace");
      await adoptCurrentReports(authorised, user);
      return Response.json({ ok: true, verified: true }, { headers });
    }
    let verificationSent = false;
    try {
      const { requestEmailSave } = await import("./email-save");
      await requestEmailSave(authorised, { email: user.email, account: true });
      verificationSent = true;
    } catch {
      /* The password account is created; expose a working resend action. */
    }
    return Response.json(
      { ok: true, verified: false, verificationSent },
      { headers },
    );
  }
  return Response.json({ ok: true }, { headers });
}
