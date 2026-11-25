import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { structured, searchWeb, AIError } from "../src/lib/ai";

test("OpenAI project key routes assessments and discovery directly, without billing fallback", async () => {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.OPENAI_API_KEY,
    oldGateway = process.env.AI_GATEWAY_API_KEY;
  process.env.OPENAI_API_KEY = "synthetic-openai-key";
  process.env.AI_GATEWAY_API_KEY = "synthetic-gateway-key";
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer synthetic-openai-key",
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
      undefined,
      [],
      {
        model: "openai/gpt-5.4-mini",
        reasoningEffort: "low",
        maxOutputTokens: 100,
      },
    );
    assert.equal(result.data.ok, true);
    assert.equal(requests[0].url, "https://api.openai.com/v1/chat/completions");
    assert.equal(requests[0].body.model, "gpt-5.4-mini");
    assert.equal(requests[0].body.store, false);
    assert.equal(requests[0].body.providerOptions, undefined);
    const links = await searchWeb("Synthetic QA");
    assert.equal(requests[1].url, "https://api.openai.com/v1/responses");
    assert.equal(links[0].url, "https://example.org/report.pdf");
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
  }
});
test("existing gateway operation is retained until an OpenAI project key is configured", async () => {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.OPENAI_API_KEY,
    oldGateway = process.env.AI_GATEWAY_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "synthetic-gateway-key";
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(
        String(url),
        "https://ai-gateway.vercel.sh/v1/chat/completions",
      );
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "openai/gpt-5.4-mini");
      assert.equal(body.providerOptions.gateway.zeroDataRetention, true);
      return Response.json({
        id: "qa",
        choices: [
          { finish_reason: "stop", message: { content: '{"ok":true}' } },
        ],
      });
    };
    await structured(z.object({ ok: z.boolean() }), "Test", {});
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    if (oldGateway === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = oldGateway;
  }
});
