export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "msi_sorp_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(request: Request, email: unknown) {
  const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const key = `${ip}:${String(email || "").trim().toLowerCase().slice(0, 254)}`;
  const now = Date.now(), current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  current.count += 1;
  return current.count > 10;
}

function accountEndpoint() {
  const events = process.env.COW_GROWTH_EVENT_URL;
  if (!events) return "";
  return events.replace(/\/events\/?(?:\?.*)?$/, "/accounts");
}

function cookieValue(request: Request) {
  const raw = request.headers.get("cookie") || "";
  return raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || "";
}

function sessionCookie(token: string) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

async function callCow(body: Record<string, unknown>) {
  const endpoint = accountEndpoint(), key = process.env.COW_GROWTH_EVENT_KEY;
  if (!endpoint || !key) return { response: null, payload: { error: "Account saving is temporarily unavailable." } as Record<string, unknown> };
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(body), cache: "no-store" });
    const payload = await response.json() as Record<string, unknown>;
    return { response, payload };
  } catch {
    return { response: null, payload: { error: "Account saving is temporarily unavailable. Your assessment is still open on this device." } as Record<string, unknown> };
  }
}

function publicPayload(payload: Record<string, unknown>) {
  const { sessionToken: _sessionToken, ...safe } = payload;
  return safe;
}

export async function GET(request: Request) {
  const token = cookieValue(request);
  if (!token) return Response.json({ signedIn: false }, { headers: { "Cache-Control": "no-store" } });
  const { response, payload } = await callCow({ action: "load", sessionToken: token });
  if (!response) return Response.json(payload, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (response.status === 401) return Response.json({ signedIn: false }, { status: 401, headers: { "Cache-Control": "no-store", "Set-Cookie": clearCookie() } });
  return Response.json({ signedIn: true, ...publicPayload(payload) }, { status: response.status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return Response.json({ error: "We could not read that account request." }, { status: 400 }); }
  const action = String(input.action || "");
  if (!["signup", "login", "save", "logout"].includes(action)) return Response.json({ error: "Unsupported account action." }, { status: 400 });
  if ((action === "signup" || action === "login") && tooManyAttempts(request, input.email)) {
    return Response.json({ error: "Too many sign-in attempts. Please wait 15 minutes and try again." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  const token = cookieValue(request);
  const { response, payload } = await callCow({ ...input, sessionToken: token });
  if (!response) return Response.json(payload, { status: 503, headers: { "Cache-Control": "no-store" } });
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if ((action === "signup" || action === "login") && typeof payload.sessionToken === "string") headers["Set-Cookie"] = sessionCookie(payload.sessionToken);
  if (action === "logout" || response.status === 401) headers["Set-Cookie"] = clearCookie();
  return Response.json(publicPayload(payload), { status: response.status, headers });
}
