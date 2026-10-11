export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "msi_sorp_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const attempts = new Map<string, { count: number; resetAt: number }>();
const ACCOUNT_UNAVAILABLE = "The secure account-saving service did not complete the request. Your assessment is still safe on this device and nothing has been lost. Please wait a moment and try again. If it still will not save, email marcus@mysocialimpact.org and we will help.";
const LEGACY_PRODUCTS_KEY = "__sorpPlatformProducts";
const PLATFORM_PRODUCTS = new Set(["social-impact-excellence", "charity-impact-reports"]);
const PRODUCT_STATUSES = new Set(["not_started", "in_progress", "complete", "awaiting_payment", "paid", "in_review", "feedback_ready", "closed"]);

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
  if (!endpoint || !key) {
    console.error("[readiness-account] account service configuration is missing", { endpointConfigured: Boolean(endpoint), keyConfigured: Boolean(key) });
    return { response: null, payload: { code: "ACCOUNT_SERVICE_UNAVAILABLE", error: ACCOUNT_UNAVAILABLE } as Record<string, unknown> };
  }
  // Do not retry a reset mutation: an upstream timeout may follow a completed
  // send or password change. The person can explicitly retry if necessary.
  const maxAttempts = ["request-reset", "reset-password"].includes(String(body.action)) ? 1 : 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      const raw = await response.text();
      let payload: Record<string, unknown>;
      try {
        payload = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      } catch {
        console.error("[readiness-account] account service returned an unreadable response", { status: response.status, contentType: response.headers.get("content-type"), attempt });
        if (attempt < maxAttempts && [502, 503, 504].includes(response.status)) continue;
        return { response: null, payload: { code: "ACCOUNT_SERVICE_BAD_RESPONSE", error: ACCOUNT_UNAVAILABLE } as Record<string, unknown> };
      }
      if (attempt < maxAttempts && [502, 503, 504].includes(response.status)) {
        console.warn("[readiness-account] retrying temporary account service failure", { status: response.status });
        continue;
      }
      return { response, payload };
    } catch (error) {
      console.error("[readiness-account] account service request failed", { attempt, error: error instanceof Error ? error.name : "unknown" });
      if (attempt < maxAttempts) continue;
    }
  }
  return { response: null, payload: { code: "ACCOUNT_SERVICE_UNAVAILABLE", error: ACCOUNT_UNAVAILABLE } as Record<string, unknown> };
}

function publicPayload(payload: Record<string, unknown>) {
  const { sessionToken: _sessionToken, ...safe } = payload;
  return safe;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function unsupportedAction(response: Response | null, payload: Record<string, unknown>) {
  return response?.status === 400 && payload.error === "Unsupported account action.";
}

async function legacyProductAction(action: string, input: Record<string, unknown>, sessionToken: string) {
  const productId = String(input.productId || "");
  if (!PLATFORM_PRODUCTS.has(productId)) return { response: new Response(null, { status: 400 }), payload: { error: "Unknown platform product." } as Record<string, unknown> };
  const loaded = await callCow({ action: "load", sessionToken });
  if (!loaded.response?.ok) return loaded;
  const progress = record(loaded.payload.progress);
  const products = record(progress[LEGACY_PRODUCTS_KEY]);
  if (action === "load-product") {
    return {
      response: new Response(null, { status: 200 }),
      payload: { account: loaded.payload.account, productId, productProgress: record(products[productId]).status ? products[productId] : null },
    };
  }
  const data = record(input.data);
  const encoded = JSON.stringify(data);
  if (encoded.length > 750_000) return { response: new Response(null, { status: 400 }), payload: { error: "Product progress is too large to save." } as Record<string, unknown> };
  const status = String(input.status || "in_progress");
  if (!PRODUCT_STATUSES.has(status)) return { response: new Response(null, { status: 400 }), payload: { error: "Unknown product status." } as Record<string, unknown> };
  const previous = record(products[productId]);
  const now = new Date().toISOString();
  const productProgress = { status, data, createdAt: previous.createdAt || now, updatedAt: now };
  const saved = await callCow({ action: "save", sessionToken, progress: { ...progress, [LEGACY_PRODUCTS_KEY]: { ...products, [productId]: productProgress } } });
  if (!saved.response?.ok) return saved;
  return { response: saved.response, payload: { account: saved.payload.account, productId, productProgress } as Record<string, unknown> };
}

async function preserveLegacyProducts(input: Record<string, unknown>, sessionToken: string) {
  const progress = record(input.progress);
  if (progress[LEGACY_PRODUCTS_KEY]) return input;
  const loaded = await callCow({ action: "load", sessionToken });
  if (!loaded.response?.ok) return input;
  const legacyProducts = record(loaded.payload.progress)[LEGACY_PRODUCTS_KEY];
  return legacyProducts ? { ...input, progress: { ...progress, [LEGACY_PRODUCTS_KEY]: legacyProducts } } : input;
}

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("feature") === "password-reset") {
    const { response, payload } = await callCow({ action: "reset-status" });
    return Response.json({ available: response?.ok === true && payload.available === true }, { headers: { "Cache-Control": "no-store" } });
  }
  const token = cookieValue(request);
  if (!token) return Response.json({ signedIn: false }, { headers: { "Cache-Control": "no-store" } });
  const { response, payload } = await callCow({ action: "load", sessionToken: token });
  if (!response) return Response.json(payload, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (response.status === 401) return Response.json({ signedIn: false }, { status: 401, headers: { "Cache-Control": "no-store", "Set-Cookie": clearCookie() } });
  return Response.json({ signedIn: true, ...publicPayload(payload) }, { status: response.status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return Response.json({ error: "We could not read the account details sent by this browser. Please refresh the page and try again; your assessment is still safe on this device." }, { status: 400 }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "Send account details as a JSON object." }, { status: 400 });
  const action = String(input.action || "");
  if (["request-reset", "reset-password"].includes(action)) {
    const origin = request.headers.get("origin");
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "Cross-site requests are not accepted." }, { status: 403 });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Send recovery details as JSON." }, { status: 415 });
    if (JSON.stringify(input).length > 4096) return Response.json({ error: "The recovery request is too large." }, { status: 413 });
    // Never trust a body-supplied IP, token destination or email template.
    const clientIp = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 128);
    const body = action === "request-reset" ? { action, email: input.email, clientIp } : { action, token: input.token, password: input.password, clientIp };
    const { response, payload } = await callCow(body);
    if (!response) return Response.json({ error: "Password reset could not be reached. Please try again shortly." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (action === "reset-password" && response.ok && payload.ok === true) headers["Set-Cookie"] = clearCookie();
    const result: Record<string, unknown> = {};
    for (const field of ["ok", "available", "message", "error"]) {
      if (typeof payload[field] === "boolean" || typeof payload[field] === "string") result[field] = payload[field];
    }
    return Response.json(result, { status: response.status, headers });
  }
  if (!["signup", "login", "save", "logout", "load-product", "save-product", "list-report-reviews", "create-report-upload", "list-product-files", "create-product-file-upload"].includes(action)) return Response.json({ error: "Unsupported account action." }, { status: 400 });
  if ((action === "signup" || action === "login") && tooManyAttempts(request, input.email)) {
    return Response.json({ error: "We have paused sign-in attempts for 15 minutes to protect your account. Your assessment is still safe on this device. Please wait and then try again." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  const token = cookieValue(request);
  const forwarded = action === "save" ? await preserveLegacyProducts(input, token) : input;
  let { response, payload } = await callCow({ ...forwarded, sessionToken: token });
  if (["load-product", "save-product"].includes(action) && unsupportedAction(response, payload)) {
    ({ response, payload } = await legacyProductAction(action, input, token));
  }
  if (!response) return Response.json(payload, { status: 503, headers: { "Cache-Control": "no-store" } });
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if ((action === "signup" || action === "login") && typeof payload.sessionToken === "string") headers["Set-Cookie"] = sessionCookie(payload.sessionToken);
  if (action === "logout" || response.status === 401) headers["Set-Cookie"] = clearCookie();
  return Response.json(publicPayload(payload), { status: response.status, headers });
}
