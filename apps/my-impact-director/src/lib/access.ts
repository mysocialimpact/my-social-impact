import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { query, transaction } from "./db";
import { AppError, rateLimit } from "./security";
import type { Identity } from "./auth";

export const ACCESS_COOKIE = "mid_access";
export const EMAIL_COOKIE = "mid_saved";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function accessToken(req: Request, cookieName = ACCESS_COOKIE) {
  const value = (req.headers.get("cookie") || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
export function accessCookie(
  token: string,
  seconds = 7 * 86400,
  cookieName = ACCESS_COOKIE,
) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
export async function localIdentity(
  req: Request,
  allowGuest = false,
): Promise<Identity | null> {
  const tokens = [
    accessToken(req, EMAIL_COOKIE),
    ...(allowGuest ? [accessToken(req)] : []),
  ].filter((x): x is string => !!x);
  if (!tokens.length) return null;
  const rows = await query<{
    id: string;
    email: string;
    name: string;
    organisation: string;
    kind: string;
    email_verified_at: string | null;
    verified_email: string | null;
  }>(
    `SELECT u.id,CASE WHEN s.kind='email' THEN COALESCE(s.verified_email,u.email) ELSE u.email END AS email,u.name,u.organisation,s.kind,u.email_verified_at,s.verified_email FROM director.access_sessions s JOIN director.users u ON u.id=s.owner_id WHERE s.token_hash=ANY($1::text[]) AND s.expires_at>now() AND u.retired_at IS NULL AND ($2 OR s.kind='email') ORDER BY s.kind`,
    [tokens.map(tokenHash), allowGuest],
  );
  const row = rows[0];
  return row
    ? {
        ...row,
        founder: false,
        anonymous: row.kind === "guest",
        emailVerified:
          row.kind === "email" &&
          !!(row.verified_email || row.email_verified_at),
        accessIds: rows.map((x) => x.id),
      }
    : null;
}

export async function localGuest(req: Request) {
  const token = accessToken(req);
  if (!token) return null;
  const user = await localIdentity(
    new Request(req.url, { headers: { cookie: `${ACCESS_COOKIE}=${token}` } }),
    true,
  );
  return user?.anonymous ? user : null;
}

export function privateNetworkKey(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const secret = process.env.CRON_SECRET;
  if (!secret)
    throw new AppError(
      503,
      "Private review access is temporarily unavailable.",
    );
  return createHmac("sha256", secret)
    .update(new Date().toISOString().slice(0, 10) + ":" + ip)
    .digest("hex");
}
export async function createGuest(req: Request) {
  const existing = await localIdentity(req, true);
  if (existing) {
    const current = accessToken(req);
    if (existing.anonymous && current) {
      await query(
        "UPDATE director.access_sessions SET expires_at=now()+interval '7 days' WHERE token_hash=$1 AND kind='guest'",
        [tokenHash(current)],
      );
      return { user: existing, cookie: accessCookie(current) };
    }
    return { user: existing, cookie: null };
  }
  await rateLimit(`visitor-v2:${privateNetworkKey(req)}`, 300, 3600);
  const token = randomBytes(32).toString("base64url"),
    id = "guest_" + randomUUID();
  await transaction(async (c) => {
    await c.query(
      "INSERT INTO director.users(id,email,name,is_anonymous) VALUES($1,'','Guest',true)",
      [id],
    );
    await c.query(
      "INSERT INTO director.access_sessions(token_hash,owner_id,kind,expires_at) VALUES($1,$2,'guest',now()+interval '7 days')",
      [tokenHash(token), id],
    );
  });
  return {
    user: {
      id,
      email: "",
      name: "Guest",
      founder: false,
      anonymous: true,
    } satisfies Identity,
    cookie: accessCookie(token),
  };
}
export async function metric(
  event:
    | "review_started"
    | "anonymous_started"
    | "review_completed"
    | "result_viewed"
    | "email_requested"
    | "email_saved"
    | "report_downloaded"
    | "enquiry_created"
    | "feedback_created",
) {
  await query(
    "INSERT INTO director.daily_metrics(event,count) VALUES($1,1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
    [event],
  );
}
export async function clearLocalSession(req: Request, includeGuest = true) {
  const tokens = [
    ...(includeGuest ? [accessToken(req)] : []),
    accessToken(req, EMAIL_COOKIE),
  ].filter((x): x is string => !!x);
  if (tokens.length)
    await query(
      "DELETE FROM director.access_sessions WHERE token_hash=ANY($1::text[])",
      [tokens.map(tokenHash)],
    );
  return [
    ...(includeGuest ? [accessCookie("", 0)] : []),
    accessCookie("", 0, EMAIL_COOKIE),
  ];
}
