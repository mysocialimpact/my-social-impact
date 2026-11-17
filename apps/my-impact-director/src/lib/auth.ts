import { z } from "zod";
import { connectVerifiedWorkspace } from "./account-workspace";
import { localIdentity, localGuest, clearLocalSession } from "./access";
import { query } from "./db";
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
  const [stored] = await query<{ email_verified_at: string | null }>(
    `INSERT INTO director.users(id,email,name,organisation) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET email=$2,name=$3,organisation=$4,last_seen=now(),email_verified_at=CASE WHEN lower(director.users.email)=lower($2) THEN director.users.email_verified_at ELSE NULL END RETURNING email_verified_at`,
    [user.id, user.email, user.name, user.organisation || null],
  );
  const aliases = stored.email_verified_at
    ? await query<{ id: string }>(
        "SELECT id FROM director.users WHERE lower(email)=lower($1) AND email_verified_at IS NOT NULL AND NOT is_anonymous",
        [user.email],
      )
    : [];
  return {
    ...user,
    emailVerified: !!stored.email_verified_at,
    passwordAccount: true,
    accessIds: [...new Set([user.id, ...aliases.map((a) => a.id)])],
  };
}
export async function visitor(req: Request): Promise<Identity> {
  if (sessionCookie(req)) {
    try {
      const user = await identity(req);
      const local = await localIdentity(req, true);
      const matched =
        !!local?.emailVerified &&
        local.email.toLowerCase() === user.email.toLowerCase();
      const guest = local?.anonymous ? local : await localGuest(req);
      if (matched && !user.emailVerified)
        await connectVerifiedWorkspace(user, local!.accessIds || [local!.id]);
      return {
        ...user,
        emailVerified: user.emailVerified || matched,
        accessIds: [
          ...new Set([
            ...(user.accessIds || [user.id]),
            ...(matched
              ? local!.accessIds || [local!.id]
              : guest?.accessIds || []),
          ]),
        ],
      };
    } catch (e) {
      if (!(e instanceof AppError && e.status === 401)) throw e;
    }
  }
  const local = await localIdentity(req, true);
  if (local) return local;
  throw new AppError(
    401,
    "This review is private to the browser that created it. Open your saved email link to return.",
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
      email: z.email().optional(),
      password: z.string().min(8).max(200).optional(),
      name: z.string().trim().min(1).max(120).optional(),
      token: z.string().min(16).max(500).optional(),
    })
    .strict()
    .parse(input);
  if (data.action === "logout" && !sessionCookie(req)) {
    const headers = new Headers({ "cache-control": "no-store" });
    for (const cookie of await clearLocalSession(req))
      headers.append("set-cookie", cookie);
    return Response.json({ ok: true }, { headers });
  }
  if (
    ["login", "signup"].includes(data.action) &&
    (!data.email || !data.password)
  )
    throw new AppError(400, "Enter your email and password.");
  if (
    data.action === "signup" &&
    ((data.name?.length || 0) < 2 || (data.password?.length || 0) < 10)
  )
    throw new AppError(
      400,
      "Use a name of at least two characters and a password of at least ten characters.",
    );
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  await rateLimit(`auth-ip:${ip}`, 30, 900);
  await rateLimit(`auth-email:${data.email || ip}`, 10, 900);
  if (data.action === "request-reset" && !data.email)
    throw new AppError(400, "Enter your email address.");
  if (
    data.action === "reset-password" &&
    (!data.token || (data.password?.length || 0) < 10)
  )
    throw new AppError(
      400,
      "Use the complete recovery link and a password of at least ten characters.",
    );
  const body =
    data.action === "signup"
      ? {
          ...data,
          name: data.name || data.email!.split("@")[0],
          position: "Not supplied",
          organisation: "Not supplied",
        }
      : data;
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
    signal: AbortSignal.timeout(20000),
  });
  const payload = await r
    .json()
    .catch(() => ({ error: "The account service is unavailable." }));
  const headers = new Headers({ "cache-control": "no-store" });
  for (const cookie of r.headers.getSetCookie())
    if (cookie.startsWith("msi_sorp_session="))
      headers.append("set-cookie", cookie);
  if (data.action === "logout") {
    for (const cookie of await clearLocalSession(req))
      headers.append("set-cookie", cookie);
  }
  if (r.ok && ["login", "signup"].includes(data.action)) {
    const session = r.headers
      .getSetCookie()
      .find((c) => c.startsWith("msi_sorp_session="))
      ?.split(";")[0];
    if (!session)
      throw new AppError(
        503,
        "Sign-in did not create a secure session. Please try again.",
      );
    const signedRequest = new Request(req.url, {
      headers: {
        cookie: [session, req.headers.get("cookie") || ""]
          .filter(Boolean)
          .join("; "),
      },
    });
    const signed = await visitor(signedRequest);
    const guest = await localGuest(req);
    if (signed.emailVerified && guest)
      await connectVerifiedWorkspace(signed, guest.accessIds || [guest.id]);
  }
  return Response.json(
    r.ok
      ? { ok: true }
      : {
          error:
            typeof payload.error === "string"
              ? payload.error
              : "Sign-in could not be completed.",
        },
    { status: r.status, headers },
  );
}

export async function passwordResetAvailable() {
  const url = accountUrl();
  url.searchParams.set("feature", "password-reset");
  const r = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json();
  return r.ok && data.available === true;
}

/** New processing requires an account; legacy private reads remain available. */
export function assertReviewAccount(user: Identity): Identity {
  if (user.anonymous || !user.email)
    throw new AppError(
      401,
      "Create your free account or log in before starting a review.",
      "ACCOUNT_REQUIRED",
    );
  return user;
}
export async function reviewAccount(req: Request): Promise<Identity> {
  try {
    return assertReviewAccount(await visitor(req));
  } catch (error) {
    if (error instanceof AppError && error.status === 401)
      throw new AppError(
        401,
        "Create your free account or log in before starting a review.",
        "ACCOUNT_REQUIRED",
      );
    throw error;
  }
}
