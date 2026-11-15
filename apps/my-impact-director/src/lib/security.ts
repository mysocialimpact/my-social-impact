import { createHash, timingSafeEqual } from "node:crypto";
import { query } from "./db";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}
export function sameOrigin(req: Request) {
  const expected = process.env.APP_ORIGIN || new URL(req.url).origin;
  // Vercel preview domains are bound to this deployment, not accepted from input.
  const allowed = [
    expected,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ].filter(Boolean);
  if (
    !allowed.includes(req.headers.get("origin") || "") ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AppError(403, "Please submit from this website.");
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const [r] = await query<{ count: number }>(
    `INSERT INTO director.rate_limits(key,count,reset_at) VALUES($1,1,now()+make_interval(secs=>$2)) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<=now() THEN 1 ELSE rate_limits.count+1 END,reset_at=CASE WHEN rate_limits.reset_at<=now() THEN now()+make_interval(secs=>$2) ELSE rate_limits.reset_at END RETURNING count`,
    [createHash("sha256").update(key).digest("hex"), seconds],
  );
  if (r.count > limit)
    throw new AppError(
      429,
      "You’ve reached the fair-use limit. Please try again later.",
      "RATE_LIMIT",
    );
}
// Aggregate spend survives report deletion. The count stores microdollars.
const usageKey = createHash("sha256").update("ai-spend:global").digest("hex");
export async function dailyUsageCost() {
  const [row] = await query<{ count: number }>(
    "SELECT count FROM director.rate_limits WHERE key=$1 AND reset_at>now()",
    [usageKey],
  );
  return (row?.count || 0) / 1_000_000;
}
export async function recordUsageCost(cost: number) {
  if (!Number.isFinite(cost) || cost <= 0) return;
  await query(
    `INSERT INTO director.rate_limits(key,count,reset_at) VALUES($1,$2,now()+interval '24 hours')
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<=now() THEN $2 ELSE rate_limits.count+$2 END,
    reset_at=CASE WHEN rate_limits.reset_at<=now() THEN now()+interval '24 hours' ELSE rate_limits.reset_at END`,
    [usageKey, Math.ceil(cost * 1_000_000)],
  );
}
export async function readJson(req: Request, max = 16000) {
  if (Number(req.headers.get("content-length") || 0) > max)
    throw new AppError(413, "This request is too large.");
  const reader = req.body?.getReader();
  if (!reader) throw new AppError(400, "Provide the requested information.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.length;
      if (bytes > max) {
        await reader.cancel();
        throw new AppError(413, "This request is too large.");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(400, "Please check the information and try again.");
  }
}
export function secretMatches(actual: string, expected: string) {
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return !!expected && a.length === b.length && timingSafeEqual(a, b);
}
export function failure(e: unknown) {
  if (e instanceof AppError)
    return Response.json(
      { error: e.message, code: e.code },
      { status: e.status },
    );
  if (e instanceof Error && e.name === "ZodError")
    return Response.json(
      { error: "Please check the information and try again." },
      { status: 400 },
    );
  return Response.json(
    {
      error:
        "We couldn’t complete this request. Your saved work is safe. Please try again.",
    },
    { status: 503 },
  );
}
