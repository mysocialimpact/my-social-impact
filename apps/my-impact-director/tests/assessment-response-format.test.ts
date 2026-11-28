import { test } from "node:test";
import assert from "node:assert/strict";
import { structured } from "../src/lib/ai";
import { actionSchema } from "../src/lib/assessment";
import { reportActionsFor } from "../src/lib/report-verdict";

test("all assessment action requests require pillar summaries in the OpenAI response format", async () => {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "synthetic-contract-only";
  const answer = {
    finding: "The synthetic source does not establish this information.",
    page: null,
    access: "not_found",
  };
  const actions = {
    summary: "A synthetic assessment used to validate the response contract.",
    strengths: ["A supported strength."],
    opportunities: ["A supported opportunity."],
    actions: Array.from({ length: 3 }, () => ({
      priority: "quick",
      title: "Clarify the presentation",
      detail: "Use the supplied source findings to improve the presentation.",
      criterionIds: ["report.1.1"],
    })),
  };
  try {
    for (const schema of [actionSchema, reportActionsFor([])]) {
      let called = false;
      globalThis.fetch = async (_url, init) => {
        called = true;
        const body = JSON.parse(String(init?.body)),
          wire = body.response_format.json_schema.schema;
        assert.equal(body.response_format.json_schema.strict, true);
        assert.deepEqual(
          new Set(wire.required),
          new Set(Object.keys(wire.properties)),
        );
        assert.equal(wire.properties.pillarSummaries.type, "array");
        const content =
          schema === actionSchema
            ? { ...actions, pillarSummaries: [] }
            : {
                ...actions,
                pillarSummaries: [],
                editorial: {
                  verdict:
                    "The report presents a synthetic example for validating response structure.",
                  attention:
                    "This is a synthetic contract test without source analysis.",
                  scoreConsistency: "consistent",
                  scoreExplanation:
                    "The synthetic findings are used only for response validation.",
                  readerTest: {
                    outcomes: answer,
                    scale: answer,
                    limitations: answer,
                    nextSteps: answer,
                  },
                },
              };
        return Response.json({
          id: "synthetic-contract",
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(content) },
            },
          ],
        });
      };
      const result = await structured(schema, "Synthetic contract only", {
        test: true,
      });
      assert.equal(called, true);
      assert.deepEqual(result.data.pillarSummaries, []);
    }
    assert.equal(
      actionSchema.parse(actions).pillarSummaries,
      undefined,
      "Existing stored results retain compatibility",
    );
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = oldKey;
  }
});
