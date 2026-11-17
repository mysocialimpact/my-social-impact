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
    process.env.VERCEL_GIT_COMMIT_REF !== "codex/assessment-quality" ||
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
    let payload = raw;
    if (req.headers.get("content-type")?.includes("application/json")) {
      const ref = JSON.parse(raw.toString("utf8"));
      if (
        !/^[a-f0-9-]{36}$/.test(ref.uploadId) ||
        !/^[a-f0-9]{64}$/.test(ref.payloadHash)
      )
        return new Response(null, { status: 400 });
      const parts = await query<{
        part: number;
        bytes: Buffer;
        file_size: number;
      }>(
        "SELECT p.part,p.bytes,u.file_size FROM director.uploads u JOIN director.upload_parts p ON p.upload_id=u.id WHERE u.id=$1 AND u.owner_id=$2 AND u.expires_at>now() ORDER BY p.part",
        [ref.uploadId, "qa-calibration-" + hash],
      );
      if (!parts.length || parts.some((p, i) => p.part !== i))
        return new Response(null, { status: 404 });
      payload = Buffer.concat(parts.map((p) => p.bytes));
      if (
        payload.length !== parts[0].file_size ||
        createHash("sha256").update(payload).digest("hex") !== ref.payloadHash
      )
        return new Response(null, { status: 400 });
      body = JSON.parse(
        gunzipSync(payload, { maxOutputLength: 16000000 }).toString("utf8"),
      );
    } else
      body = JSON.parse(
        (req.headers.get("content-encoding") === "gzip"
          ? gunzipSync(payload, { maxOutputLength: 16000000 })
          : payload
        ).toString("utf8"),
      );
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    !["openai/gpt-5.4-nano", "openai/gpt-5.4-mini"].includes(body.model) ||
    body.max_completion_tokens !== 14000 ||
    body.store !== false ||
    body.tools ||
    body.stream ||
    body.providerOptions?.gateway?.only?.join(",") !== "openai" ||
    body.providerOptions?.gateway?.zeroDataRetention !== true
  )
    return new Response(null, { status: 400 });
  const reserve = body.model === "openai/gpt-5.4-mini" ? 363000 : 97500;
  const key = "impact-edit-calibration:" + hash;
  const rows = await query(
    "INSERT INTO director.rate_limits(key,count,reset_at) VALUES($1,$3,$2) ON CONFLICT(key) DO UPDATE SET count=director.rate_limits.count+$3 WHERE director.rate_limits.count+$3<=2000000 AND director.rate_limits.reset_at>now() RETURNING count",
    [key, new Date(until).toISOString(), reserve],
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
        data.usage.prompt_tokens *
          (body.model === "openai/gpt-5.4-mini" ? 0.75 : 0.2) +
          data.usage.completion_tokens *
            (body.model === "openai/gpt-5.4-mini" ? 4.5 : 1.25),
      );
      if (actual <= reserve)
        await query(
          "UPDATE director.rate_limits SET count=count-$2 WHERE key=$1",
          [key, reserve - actual],
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
