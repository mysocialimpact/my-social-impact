// Temporary approved calibration relay. Never enabled in production; removed before release.
import { createHash, timingSafeEqual } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { getVercelOidcToken } from "@vercel/functions/oidc";
import { query } from "@/lib/db";
export const maxDuration = 300;
export async function POST(req: Request) {
  const expected = process.env.ART_DIRECTOR_PROBE_TOKEN_HASH || "",
    until = Number(process.env.ART_DIRECTOR_PROBE_UNTIL || 0);
  const token = (req.headers.get("authorization") || "").replace(
      /^Bearer /,
      "",
    ),
    hash = createHash("sha256").update(token).digest("hex");
  if (
    process.env.VERCEL_ENV !== "preview" ||
    process.env.VERCEL_GIT_COMMIT_REF !== "codex/impact-edit-art-director" ||
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
        gunzipSync(payload, { maxOutputLength: 32000000 }).toString("utf8"),
      );
    } else
      body = JSON.parse(
        (req.headers.get("content-encoding") === "gzip"
          ? gunzipSync(payload, { maxOutputLength: 32000000 })
          : payload
        ).toString("utf8"),
      );
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    !["openai/gpt-6-astra", "openai/gpt-6.1-terra"].includes(body.model) ||
    ![12000, 18000].includes(body.max_completion_tokens) ||
    body.store !== false ||
    body.tools ||
    body.stream ||
    body.providerOptions?.gateway?.only?.join(",") !== "openai" ||
    body.providerOptions?.gateway?.zeroDataRetention !== true
  )
    return new Response(null, { status: 400 });
  const inputBytes =
    Buffer.byteLength(JSON.stringify(body.response_format)) +
    body.messages.reduce(
      (n: number, m: { content: unknown }) =>
        n +
        (typeof m.content === "string"
          ? Buffer.byteLength(m.content)
          : Array.isArray(m.content)
            ? m.content.reduce(
                (a: number, c: { type: string; text?: string }) =>
                  a + (c.type === "text" ? Buffer.byteLength(c.text || "") : 0),
                0,
              )
            : 0),
      0,
    );
  const images = body.messages.flatMap((m: { content: unknown }) =>
    Array.isArray(m.content)
      ? m.content.filter((c: { type: string }) => c.type === "image_url")
      : [],
  );
  if (images.length > 30 || inputBytes > 300000)
    return new Response(null, { status: 413 });
  // Conservative image-token reservation for <=1600px page images, not an invoice.
  const estimatedInput = inputBytes + 8192 * images.length;
  const base =
    body.model === "openai/gpt-6-astra"
      ? { input: 10, output: 50 }
      : { input: 1, output: 5 };
  const reservation = Math.ceil(
    estimatedInput * base.input * (estimatedInput > 272000 ? 2 : 1) +
      body.max_completion_tokens *
        base.output *
        (estimatedInput > 272000 ? 1.5 : 1),
  );
  const key = "art-director-calibration:" + hash;
  if (reservation > 5000000)
    return Response.json(
      { error: { code: "CALIBRATION_RESERVATION_TOO_LARGE" } },
      { status: 429 },
    );
  const rows = await query(
    "INSERT INTO director.rate_limits(key,count,reset_at) VALUES($1,$3,$2) ON CONFLICT(key) DO UPDATE SET count=director.rate_limits.count+$3 WHERE director.rate_limits.count+$3<=5000000 AND director.rate_limits.reset_at>now() RETURNING count",
    [key, new Date(until).toISOString(), reservation],
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
          base.input *
          (data.usage.prompt_tokens > 272000 ? 2 : 1) +
          data.usage.completion_tokens *
            base.output *
            (data.usage.prompt_tokens > 272000 ? 1.5 : 1),
      );
      if (Number.isFinite(actual))
        await query(
          "UPDATE director.rate_limits SET count=count-$2 WHERE key=$1",
          [key, reservation - actual],
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
