import { z } from "zod";
import { localIdentity, clearLocalSession } from "./access";
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
  await query(
    `INSERT INTO director.users(id,email,name,organisation) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET email=$2,name=$3,organisation=$4,last_seen=now()`,
    [user.id, user.email, user.name, user.organisation || null],
  );
  return user;
}
export async function visitor(req: Request): Promise<Identity> {
  if (sessionCookie(req)) {
    try {
      const user = await identity(req);
      const local = await localIdentity(req, true);
      return {
        ...user,
        emailVerified:
          !!local &&
          !local.anonymous &&
          local.email.toLowerCase() === user.email.toLowerCase(),
        accessIds: [user.id, ...(local?.accessIds || [])],
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
      action: z.enum(["login", "signup", "logout"]),
      email: z.email().optional(),
      password: z.string().min(8).max(200).optional(),
      name: z.string().trim().min(1).max(120).optional(),
    })
    .strict()
    .parse(input);
  if (data.action === "logout" && !sessionCookie(req)) {
    const headers = new Headers({ "cache-control": "no-store" });
    for (const cookie of await clearLocalSession(req))
      headers.append("set-cookie", cookie);
    return Response.json({ ok: true }, { headers });
  }
  if (data.action !== "logout" && (!data.email || !data.password))
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
