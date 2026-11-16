// Temporary approved calibration relay. Never enabled in production; removed before release.
import { createHash, timingSafeEqual } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { getVercelOidcToken } from "@vercel/functions/oidc";
import { query } from "@/lib/db";
export const maxDuration = 300;
export async function POST(req: Request) {
  const expected = process.env.IMPACT_EDIT_CALIBRATION_TOKEN_HASH || "",
    until = Date.parse(process.env.IMPACT_EDIT_CALIBRATION_UNTIL || "");
  const token = (req.headers.get("authorization") || "").replace(
      /^Bearer /,
      "",
    ),
    hash = createHash("sha256").update(token).digest("hex");
  if (
    process.env.VERCEL_ENV !== "preview" ||
    process.env.VERCEL_GIT_COMMIT_REF !== "codex/impact-edit-v2" ||
    !Number.isFinite(until) ||
    Date.now() >= until ||
    expected.length !== 64 ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(hash))
  )
    return new Response(null, { status: 404 });
  if (
    new URL(process.env.DATABASE_URL || "https://invalid").pathname !==
    "/my_impact_director_validation"
  )
    return Response.json(
      { error: "Validation database required." },
      { status: 503 },
    );
  const raw = Buffer.from(await req.arrayBuffer());
  if (raw.length > 4200000) return new Response(null, { status: 413 });
  let body;
  try {
    body = JSON.parse(
      (req.headers.get("content-encoding") === "gzip"
        ? gunzipSync(raw, { maxOutputLength: 16000000 })
        : raw
      ).toString("utf8"),
    );
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    body.model !== "openai/gpt-5.4-nano" ||
    body.max_completion_tokens !== 14000 ||
    body.store !== false ||
    body.tools ||
    body.stream ||
    body.providerOptions?.gateway?.only?.join(",") !== "openai" ||
    body.providerOptions?.gateway?.zeroDataRetention !== true
  )
    return new Response(null, { status: 400 });
  const key = "impact-edit-calibration:" + hash;
  const rows = await query(
    "INSERT INTO director.rate_limits(key,count,reset_at) VALUES($1,97500,$2) ON CONFLICT(key) DO UPDATE SET count=director.rate_limits.count+97500 WHERE director.rate_limits.count+97500<=2000000 AND director.rate_limits.reset_at>now() RETURNING count",
    [key, new Date(until).toISOString()],
  );
  if (!rows.length)
    return Response.json(
      { error: { code: "CALIBRATION_BUDGET_EXHAUSTED" } },
      { status: 429 },
    );
  try {
    const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + (await getVercelOidcToken()),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(160000),
    });
    const data = await r.json();
    if (
      Number.isFinite(data.usage?.prompt_tokens) &&
      Number.isFinite(data.usage?.completion_tokens)
    ) {
      const actual = Math.ceil(
        data.usage.prompt_tokens * 0.2 + data.usage.completion_tokens * 1.25,
      );
      if (actual <= 97500)
        await query(
          "UPDATE director.rate_limits SET count=count-$2 WHERE key=$1",
          [key, 97500 - actual],
        );
    }
    return Response.json(data, {
      status: r.status,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: { code: "CALIBRATION_RELAY_FAILED" } },
      { status: 502 },
    );
  }
}
