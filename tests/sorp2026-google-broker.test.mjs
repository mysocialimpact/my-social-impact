import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const bundled = await build({
  stdin: { contents: 'export { oauthUrl, readinessAccountOauthUrl, validReadinessAccountOauthState } from "./app/booking-google.ts"; export { GET as callback } from "./app/api/booking/google/callback/route.ts";', resolveDir: process.cwd() },
  bundle: true, platform: "node", format: "esm", target: "node22", write: false,
});
const { oauthUrl, readinessAccountOauthUrl, validReadinessAccountOauthState, callback } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const growthRoute = readFileSync(new URL("../app/api/growth-event/route.ts", import.meta.url), "utf8");

function withGoogleEnvironment() {
  const names = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_REDIRECT_URI", "GOOGLE_READINESS_REDIRECT_URI", "COW_GROWTH_EVENT_URL", "COW_GROWTH_EVENT_KEY", "SORP2026_PUBLIC_ORIGIN"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, {
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    GOOGLE_REFRESH_TOKEN: "refresh-token",
    GOOGLE_REDIRECT_URI: "https://mysocialimpact.org/api/booking/google/callback",
    GOOGLE_READINESS_REDIRECT_URI: "https://sorp2026.org/api/booking/google/callback",
    COW_GROWTH_EVENT_URL: "https://cow.example.test/api/growth/events",
    COW_GROWTH_EVENT_KEY: "cow-key",
    SORP2026_PUBLIC_ORIGIN: "https://sorp2026.org",
  });
  return () => { for (const name of names) previous[name] === undefined ? delete process.env[name] : process.env[name] = previous[name]; };
}

test("SORP2026 identity OAuth is separate from the existing Calendar OAuth", () => {
  const restore = withGoogleEnvironment();
  try {
    const identity = new URL(readinessAccountOauthUrl());
    assert.equal(identity.searchParams.get("redirect_uri"), "https://sorp2026.org/api/booking/google/callback");
    assert.equal(identity.searchParams.get("scope"), "openid email profile");
    assert.equal(validReadinessAccountOauthState(identity.searchParams.get("state")), true);
    const calendar = new URL(oauthUrl());
    assert.equal(calendar.searchParams.get("redirect_uri"), "https://mysocialimpact.org/api/booking/google/callback");
    assert.match(calendar.searchParams.get("scope"), /calendar\.events/);
  } finally { restore(); }
});

test("verified Google identity creates a destination-owned session cookie and redirects home", async () => {
  const restore = withGoogleEnvironment();
  const originalFetch = globalThis.fetch;
  try {
    const state = new URL(readinessAccountOauthUrl()).searchParams.get("state");
    const calls = [];
    globalThis.fetch = async (input, init = {}) => {
      const url = String(input); calls.push({ url, init });
      if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "access-token" });
      if (url === "https://openidconnect.googleapis.com/v1/userinfo") return Response.json({ sub: "google-subject", email: "Person@Example.org", email_verified: true, name: "Person" });
      if (url === "https://cow.example.test/api/growth/accounts") return Response.json({ sessionToken: "session-token" });
      throw new Error(`Unexpected request: ${url}`);
    };
    const response = await callback(new Request(`https://mysocialimpact.org/api/booking/google/callback?code=code&state=${encodeURIComponent(state)}`));
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "https://sorp2026.org/are-you-sorp-ready/review/?account=google");
    assert.equal(response.headers.get("set-cookie"), "msi_sorp_session=session-token; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax");
    const accountCall = calls.find(call => call.url.endsWith("/api/growth/accounts"));
    assert.equal(accountCall.init.headers.authorization, "Bearer cow-key");
    const accountBody = JSON.parse(accountCall.init.body);
    assert.equal(accountBody.action, "login");
    assert.equal(accountBody.email, "person@example.org");
    assert.match(accountBody.password, /^[A-Za-z0-9_-]{40,}$/);
  } finally { globalThis.fetch = originalFetch; restore(); }
});

test("an invalid identity callback cannot contact Google or Cow", async () => {
  const restore = withGoogleEnvironment();
  const originalFetch = globalThis.fetch;
  let contacted = false;
  globalThis.fetch = async () => { contacted = true; return new Response(); };
  try {
    const response = await callback(new Request("https://mysocialimpact.org/api/booking/google/callback?code=code&state=invalid"));
    assert.equal(response.status, 400);
    assert.equal(contacted, false);
  } finally { globalThis.fetch = originalFetch; restore(); }
});

test("the destination's account and conversion events remain explicitly allowlisted", () => {
  for (const event of ["account_created", "account_signed_in", "google_sign_in_started", "email_review_30_clicked", "monthly_impact_director_clicked"])
    assert.match(growthRoute, new RegExp(`"${event}"`));
});
