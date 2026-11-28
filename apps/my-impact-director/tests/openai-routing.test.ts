import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  structured,
  searchWeb,
  AIError,
  aiAvailable,
  modelRates,
} from "../src/lib/ai";

test("OpenAI project key routes assessments and discovery directly, without billing fallback", async () => {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.OPENAI_API_KEY,
    oldGateway = process.env.AI_GATEWAY_API_KEY,
    oldProject = process.env.OPENAI_PROJECT_ID,
    oldOrg = process.env.OPENAI_ORGANIZATION_ID;
  process.env.OPENAI_API_KEY = "synthetic-openai-key";
  process.env.AI_GATEWAY_API_KEY = "synthetic-gateway-key";
  process.env.OPENAI_PROJECT_ID = "proj_synthetic";
  process.env.OPENAI_ORGANIZATION_ID = "org_synthetic";
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer synthetic-openai-key",
      );
      assert.equal(
        new Headers(init?.headers).get("OpenAI-Project"),
        "proj_synthetic",
      );
      assert.equal(
        new Headers(init?.headers).get("OpenAI-Organization"),
        "org_synthetic",
      );
      requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      if (String(url).endsWith("/responses"))
        return Response.json({
          output: [
            {
              content: [
                {
                  annotations: [
                    {
                      type: "url_citation",
                      url: "https://example.org/report.pdf",
                      title: "Report",
                    },
                  ],
                },
              ],
            },
          ],
        });
      return Response.json({
        id: "qa",
        model: "gpt-5.4-mini",
        usage: { prompt_tokens: 1, completion_tokens: 1 },
        choices: [
          { finish_reason: "stop", message: { content: '{"ok":true}' } },
        ],
      });
    };
    const result = await structured(
      z.object({ ok: z.boolean() }).strict(),
      "Test only",
      { source: "synthetic" },
      Buffer.from("synthetic PDF contract"),
      [
        {
          page: 2,
          dataUrl: "data:image/jpeg;base64,synthetic",
          view: "full page",
        },
      ],
      {
        model: "openai/gpt-5.4-mini",
        reasoningEffort: "low",
        maxOutputTokens: 100,
      },
    );
    assert.equal(result.data.ok, true);
    assert.equal(result.usage.inputTokens, 1);
    assert.equal(result.usage.outputTokens, 1);
    assert.equal(result.usage.cost, 0.00000075 + 0.0000045);
    assert.equal(result.usage.model, "gpt-5.4-mini");
    assert.deepEqual(
      modelRates("gpt-6.1-terra"),
      modelRates("openai/gpt-6.1-terra"),
    );
    assert.equal(requests[0].url, "https://api.openai.com/v1/chat/completions");
    assert.equal(requests[0].body.model, "gpt-5.4-mini");
    assert.equal(requests[0].body.store, false);
    assert.equal(requests[0].body.reasoning_effort, "low");
    assert.equal(requests[0].body.max_completion_tokens, 100);
    const content = (requests[0].body.messages as { content: unknown[] }[])[1]
      .content;
    assert.deepEqual(content[1], {
      type: "file",
      file: {
        filename: "report.pdf",
        file_data: `data:application/pdf;base64,${Buffer.from("synthetic PDF contract").toString("base64")}`,
      },
    });
    assert.deepEqual(content[3], {
      type: "image_url",
      image_url: { url: "data:image/jpeg;base64,synthetic", detail: "high" },
    });
    assert.equal(requests[0].body.providerOptions, undefined);
    const links = await searchWeb("Synthetic QA");
    assert.equal(requests[1].url, "https://api.openai.com/v1/responses");
    assert.equal(links[0].url, "https://example.org/report.pdf");
    assert.equal(requests[1].body.model, "gpt-5.4-mini");
    assert.equal(requests[1].body.store, false);
    let failures = 0;
    globalThis.fetch = async (url) => {
      failures++;
      assert.equal(String(url), "https://api.openai.com/v1/chat/completions");
      return Response.json(
        { error: { code: "credit_balance_exhausted" } },
        { status: 429 },
      );
    };
    await assert.rejects(
      () => structured(z.object({ ok: z.boolean() }), "Test", {}),
      (e: unknown) =>
        e instanceof AIError && e.code === "credit_balance_exhausted",
    );
    assert.equal(failures, 1);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    if (oldGateway === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = oldGateway;
    if (oldProject === undefined) delete process.env.OPENAI_PROJECT_ID;
    else process.env.OPENAI_PROJECT_ID = oldProject;
    if (oldOrg === undefined) delete process.env.OPENAI_ORGANIZATION_ID;
    else process.env.OPENAI_ORGANIZATION_ID = oldOrg;
  }
});
test("missing direct key never silently resumes gateway billing", async () => {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.OPENAI_API_KEY,
    oldGateway = process.env.AI_GATEWAY_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "synthetic-gateway-key";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw Error("No provider request permitted");
  };
  try {
    assert.equal(aiAvailable(), false);
    for (const call of [
      () => structured(z.object({ ok: z.boolean() }).strict(), "Synthetic", {}),
      () => searchWeb("Synthetic"),
    ])
      await assert.rejects(
        call,
        (e: unknown) => e instanceof AIError && e.code === "AI_NOT_CONFIGURED",
      );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    if (oldGateway === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = oldGateway;
  }
});
