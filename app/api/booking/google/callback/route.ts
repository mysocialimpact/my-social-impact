import { exchangeOauthCode, validOauthState } from "../../../../booking-google";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  if (!code || !validOauthState(state)) return new Response("Google authorisation could not be verified.", { status: 400 });
  try {
    const token = await exchangeOauthCode(code);
    return new Response(`<!doctype html><meta name="robots" content="noindex"><title>Google Calendar connected</title><style>body{font:16px system-ui;max-width:720px;margin:12vh auto;padding:24px}textarea{width:100%;min-height:120px}h1{font-family:Georgia,serif;font-size:42px}</style><h1>Google Calendar connected ✓</h1><p>Copy this one-time production refresh token into the secure Vercel environment variable <strong>GOOGLE_REFRESH_TOKEN</strong>. It is not stored in the browser or application.</p><textarea readonly aria-label="Google refresh token">${token}</textarea><p>You can close this page after the production environment has been updated.</p>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Google authorisation did not complete.", { status: 502 });
  }
}
