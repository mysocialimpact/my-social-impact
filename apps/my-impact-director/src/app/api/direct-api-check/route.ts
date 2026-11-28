import { z } from "zod";
import { visitor } from "@/lib/auth";
import { query } from "@/lib/db";
import { structured, SAFETY, modelRates } from "@/lib/ai";
import {
  artReviewFor,
  artImages,
  artConfiguration,
  ART_FIRST_INSTRUCTIONS,
  validateArtReview,
} from "@/lib/art-director";
import {
  sameOrigin,
  readJson,
  rateLimit,
  recordUsageCost,
} from "@/lib/security";
import type { Page } from "@/lib/assessment";
export const maxDuration = 300;
export async function POST(req: Request) {
  if (process.env.VERCEL_ENV !== "preview")
    return new Response(null, { status: 404 });
  sameOrigin(req);
  const user = await visitor(req);
  if (user.id !== "qa_direct_openai_20261128")
    return new Response(null, { status: 403 });
  const [db] = await query<{ name: string }>(
    "SELECT current_database() AS name",
  );
  if (db.name !== "my_impact_director_validation")
    return new Response(null, { status: 404 });
  await rateLimit("direct-openai-diagnostic", 3, 3600);
  const { transport } = z
    .object({ transport: z.enum(["chat", "responses"]) })
    .strict()
    .parse(await readJson(req));
  const [doc] = await query<{ file_bytes: Buffer; pages: Page[] }>(
    "SELECT file_bytes,pages FROM director.reports WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 1",
    [user.id],
  );
  const required = [1, 2, 3, 4],
    images = await artImages(doc.file_bytes, required),
    config = artConfiguration().director;
  const schema = artReviewFor(required),
    input = {
      physicalPages: required,
      totalPages: 4,
      coverage: "every physical PDF page",
      sourceText: doc.pages.map(({ page, text, readable }) => ({
        page,
        text,
        readable,
      })),
    };
  let data: unknown, usage: unknown;
  if (transport === "chat") {
    const response = await structured(
      schema,
      ART_FIRST_INSTRUCTIONS,
      input,
      undefined,
      images,
      config,
    );
    data = response.data;
    usage = response.usage;
    await recordUsageCost(response.usage.cost);
  } else {
    const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" });
    delete jsonSchema.$schema;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Project": process.env.OPENAI_PROJECT_ID!,
        "OpenAI-Organization": process.env.OPENAI_ORGANIZATION_ID!,
      },
      signal: AbortSignal.timeout(160000),
      body: JSON.stringify({
        model: config.model.replace(/^openai\//, ""),
        store: false,
        reasoning: { effort: config.reasoningEffort },
        max_output_tokens: config.maxOutputTokens,
        input: [
          { role: "system", content: SAFETY + "\n" + ART_FIRST_INSTRUCTIONS },
          {
            role: "user",
            content: [
              { type: "input_text", text: JSON.stringify(input) },
              ...images.flatMap((image) => [
                {
                  type: "input_text",
                  text: `Original physical PDF page ${image.page}; ${image.view}`,
                },
                {
                  type: "input_image",
                  image_url: image.dataUrl,
                  detail: "high",
                },
              ]),
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "assessment_stage",
            strict: true,
            schema: jsonSchema,
          },
        },
      }),
    });
    const result = await response.json();
    if (!response.ok)
      return Response.json(
        { status: response.status, errorCode: result.error?.code },
        { status: 502 },
      );
    const text = result.output
      .flatMap(
        (o: { content?: { type: string; text?: string }[] }) => o.content || [],
      )
      .filter((c: { type: string }) => c.type === "output_text")
      .map((c: { text: string }) => c.text)
      .join("");
    data = JSON.parse(text);
    const rates = modelRates(config.model),
      cost =
        Number(result.usage.input_tokens) * rates.input +
        Number(result.usage.output_tokens) * rates.output;
    await recordUsageCost(cost);
    usage = {
      model: result.model,
      responseId: result.id,
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
      cost,
      project: response.headers.get("openai-project"),
      organisation: response.headers.get("openai-organization"),
    };
  }
  let validation = "passed";
  try {
    validateArtReview(data, required);
  } catch (e) {
    validation = e instanceof Error ? e.message : "failed";
  }
  return Response.json({ transport, validation, data, usage });
}
