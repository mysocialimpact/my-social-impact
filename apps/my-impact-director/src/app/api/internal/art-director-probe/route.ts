// Temporary, preview-only model-access check. Removed before release.
import { createHash } from "node:crypto";
import { z } from "zod";
import { createCanvas } from "@napi-rs/canvas";
import { structured, AIError } from "@/lib/ai";
import { query } from "@/lib/db";
import { readJson, secretMatches } from "@/lib/security";
export const maxDuration = 180;
export async function POST(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(
    /^Bearer /,
    "",
  );
  if (
    process.env.VERCEL_ENV !== "preview" ||
    Date.now() > Number(process.env.ART_DIRECTOR_PROBE_UNTIL || 0) ||
    !secretMatches(
      createHash("sha256").update(token).digest("hex"),
      process.env.ART_DIRECTOR_PROBE_TOKEN_HASH || "",
    )
  )
    return new Response(null, { status: 404 });
  const { model } = z
    .object({
      model: z.enum([
        "openai/gpt-6.1-terra",
        "openai/gpt-6.1-sol",
        "openai/gpt-6-astra",
      ]),
    })
    .strict()
    .parse(await readJson(req, 200));
  const [limit] = await query(
    "INSERT INTO director.rate_limits(key,count,reset_at) VALUES('art-director-access-probe',1,now()+interval '1 day') ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 WHERE rate_limits.count<3 RETURNING count",
  );
  if (!limit)
    return Response.json({ error: "Probe limit reached" }, { status: 429 });
  const c = createCanvas(128, 128),
    ctx = c.getContext("2d");
  ctx.fillStyle = "#080f23";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#ff4f18";
  ctx.beginPath();
  ctx.arc(64, 64, 35, 0, Math.PI * 2);
  ctx.fill();
  try {
    const r = await structured(
      z.object({ shape: z.string(), colours: z.array(z.string()) }).strict(),
      "Describe only the shape and colours in the supplied synthetic test image.",
      { synthetic: true },
      undefined,
      [{ page: 1, dataUrl: c.toDataURL("image/png") }],
      { model, reasoningEffort: "low", maxOutputTokens: 512 },
    );
    return Response.json({ available: true, ...r });
  } catch (e) {
    return Response.json(
      {
        available: false,
        code: e instanceof AIError ? e.code : "PROBE_FAILED",
        diagnostic: e instanceof AIError ? e.diagnostic : undefined,
      },
      { status: 503 },
    );
  }
}
