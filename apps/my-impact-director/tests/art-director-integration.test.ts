import { workspaces } from "../src/lib/workspace";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createGuest } from "../src/lib/access";
import { createReview, startFramework, getReview } from "../src/lib/reviews";
import { processOne, type ReviewResult } from "../src/lib/pipeline";
import { extractPages } from "../src/lib/documents";
import { sourcePassages } from "../src/lib/passages";
import { query, database } from "../src/lib/db";
import { exportPdf } from "../src/lib/archive/export";
import { GET as snapshot } from "../src/app/api/reviews/[id]/route";
import { firstOpinion, testFindings } from "./fixtures/art-director";
test(
  "durable art director sees all pages before scores, pins models, audits evidence and reopens saved results without inference",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 90000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    process.env.REVIEWS_ENABLED = "true";
    process.env.AI_GATEWAY_API_KEY = "synthetic-contract-only";
    const original = globalThis.fetch,
      oldDirector = process.env.IMPACT_EDIT_DIRECTOR_MODEL;
    process.env.IMPACT_EDIT_DIRECTOR_MODEL = "openai/gpt-6-astra";
    const guest = await createGuest(
      new Request("https://test.example", {
        headers: { "x-forwarded-for": "art-" + randomUUID() },
      }),
    );
    let reportId: string | undefined;
    let calls = 0;
    try {
      const pdf = await PDFDocument.create(),
        font = await pdf.embedFont(StandardFonts.Helvetica);
      for (let i = 0; i < 2; i++)
        pdf.addPage().drawText("Synthetic community housing advice report.", {
          font,
          size: 14,
          x: 40,
          y: 700,
        });
      const bytes = Buffer.from(await pdf.save()),
        pages = await extractPages(bytes),
        passages = sourcePassages(pages);
      const context = {
        organisation: "Synthetic QA",
        title: "Synthetic art-director report",
        reportingPeriod: "2025",
        beneficiaries: [],
        activities: [],
        outcomes: [],
        context: "Synthetic database and model contract.",
        limitations: ["Not a genuine professional judgement."],
      };
      const root = await createReview(
        guest.user,
        bytes,
        "art-qa.pdf",
        true,
        false,
        null,
        true,
      );
      reportId = String((await getReview(guest.user, root.id)).report_id);
      const notes = [
        {
          kind: "shared-non-editorial-note",
          page: 1,
          description:
            "Must survive without art-director opinion being added to shared understanding.",
        },
      ];
      await query(
        "UPDATE director.reports SET understanding_ready=true,understanding_context=$2,understanding_claims='[]',pages=$3,extraction_notes=$4 WHERE id=$1",
        [
          reportId,
          JSON.stringify(context),
          JSON.stringify(pages),
          JSON.stringify(notes),
        ],
      );
      const historical = {
        version: "2.0.1",
        scores: { report: { overall: 81 } },
        fixture:
          "Immutable historical storage envelope, never supplied to the new model.",
      };
      const [old] = await query<{ id: string }>(
        "INSERT INTO director.reviews(report_id,version,framework,status,stage,result) VALUES($1,'2.0.1-report','report','complete',15,$2) RETURNING id",
        [reportId, JSON.stringify(historical)],
      );
      const selected = await startFramework(guest.user, root.id, "report");
      const referenced = (score = 3) =>
        testFindings(score).map(({ evidence, ...f }) => ({
          ...f,
          evidenceIds: [passages[0].id],
        }));
      const answer = {
        finding:
          "The answer is explicitly located on the inspected synthetic first physical page.",
        page: 1,
        access: "easy",
      };
      globalThis.fetch = async (input, init) => {
        assert.equal(
          String(input),
          "https://ai-gateway.vercel.sh/v1/chat/completions",
        );
        calls++;
        const body = JSON.parse(String(init?.body)),
          payload = JSON.parse(body.messages[1].content[0].text),
          images = body.messages[1].content.filter(
            (p: { type: string }) => p.type === "image_url",
          );
        assert.equal(
          images.length,
          2,
          "Both real physical page images reach every test pass",
        );
        assert.ok(
          images.every((i: { image_url: { url: string } }) =>
            i.image_url.url.startsWith("data:image/jpeg;base64,"),
          ),
        );
        assert.equal(body.reasoning_effort, "high");
        let data: unknown;
        if (calls === 1) {
          assert.equal(body.model, "openai/gpt-6-astra");
          assert.equal(payload.criteria, undefined);
          assert.equal(payload.initialFindings, undefined);
          assert.equal(payload.calculatedScores, undefined);
          assert.deepEqual(payload.physicalPages, [1, 2]);
          assert.equal(
            JSON.stringify(payload).includes(historical.fixture),
            false,
          );
          data = firstOpinion();
        } else if (calls === 2) {
          assert.equal(body.model, "openai/gpt-6.1-terra");
          assert.equal(
            payload.independentEditorialReview.dimensions.design.judgement,
            "weak",
          );
          data = { findings: referenced() };
        } else {
          assert.equal(calls, 3);
          assert.equal(
            body.model,
            "openai/gpt-6-astra",
            "Model changed in env must not change an in-flight saved profile",
          );
          assert.ok(
            payload.contradictionsToInvestigate.some((x: string) =>
              x.startsWith("design:"),
            ),
          );
          data = {
            summary:
              "A synthetic editorial conclusion grounded in the supplied fixture.",
            strengths: [
              "The main purpose is clearly expressed on the first page.",
            ],
            opportunities: [
              "Improve design hierarchy so the important message is easier to locate.",
            ],
            actions: [1, 2, 3].map((i) => ({
              priority: "important",
              title: `Improve the synthetic design ${i}`,
              detail:
                "Make the main finding easier to find and retain the useful source wording.",
              criterionIds: ["report.3.1"],
            })),
            editorial: {
              verdict:
                "A synthetic readable publication with weak visual hierarchy; this is a contract fixture, not an independent professional judgement.",
              attention:
                "The design needs more helpful emphasis and visual separation of the main findings.",
              scoreConsistency: "consistent",
              scoreExplanation:
                "The corrected design criteria now follow the observed weak hierarchy rather than awarding points for feature presence.",
              readerTest: {
                outcomes: answer,
                scale: answer,
                limitations: answer,
                nextSteps: answer,
              },
            },
            corrections: referenced(1).slice(10, 15),
            resolutions: [
              {
                pillar: "Visual Design",
                explanation:
                  "The observed weak execution justifies criterion corrections, not an arbitrary total-score penalty.",
                pages: [1],
              },
            ],
          };
        }
        return Response.json({
          id: "synthetic-" + calls,
          model: body.model,
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(data) },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 100 },
        });
      };
      const concurrent = await Promise.all([
        processOne(selected.id),
        processOne(selected.id),
      ]);
      assert.deepEqual(concurrent.sort(), [false, true]);
      assert.equal(calls, 1);
      const running = await getReview(guest.user, selected.id);
      assert.equal(running.stage, 24);
      assert.ok(running.engine_state);
      assert.equal(
        await processOne(selected.id, Date.now() - 1000),
        false,
        "A nearly expired function must defer the next expensive art stage",
      );
      assert.equal(calls, 1, "Deferral must not start or charge an inference");
      assert.equal((await getReview(guest.user, selected.id)).stage, 24);
      const privateRequest = () =>
        new Request(`https://test.example/api/reviews/${selected.id}`, {
          headers: { cookie: guest.cookie!.split(";")[0] },
        });
      const pendingSnapshot = await snapshot(privateRequest(), {
        params: Promise.resolve({ id: selected.id }),
      });
      assert.equal(pendingSnapshot.status, 200);
      assert.equal((await pendingSnapshot.json()).engine_state, undefined);
      process.env.IMPACT_EDIT_DIRECTOR_MODEL = "openai/gpt-6.1-sol";
      for (let i = 0; i < 3; i++)
        assert.equal(await processOne(selected.id), true);
      const done = await getReview(guest.user, selected.id),
        result = done.result as ReviewResult;
      assert.equal(done.status, "complete");
      assert.equal(done.version, "2.1.0-report");
      assert.equal(done.engine_state, null);
      assert.equal(result.qualityControl?.calculatedOverall, 62.5);
      assert.equal(result.scores.report!.overall, 62.5);
      assert.equal(result.scores.report!.provisional, false);
      const historicalResult = structuredClone(result);
      historicalResult.scores.report!.overall = null;
      historicalResult.scores.report!.provisional = true;
      delete historicalResult.scores.report!.unroundedOverall;
      await query("UPDATE director.reviews SET result=$2 WHERE id=$1", [
        selected.id,
        JSON.stringify(historicalResult),
      ]);
      const dashboard = await workspaces(guest.user, selected.id);
      const design = (
        dashboard[0].assessments as {
          framework: string;
          score: number;
          publication?: unknown;
        }[]
      ).find((a) => a.framework === "report");
      assert.equal(design?.score, 62.5);
      assert.equal(
        design?.publication,
        undefined,
        "Audit details stay out of the dashboard response",
      );
      await query("UPDATE director.reviews SET result=$2 WHERE id=$1", [
        selected.id,
        JSON.stringify(result),
      ]);

      assert.equal(result.scores.report!.principles[2].score, 6.25);
      assert.equal(result.qualityControl?.changes.length, 5);
      assert.deepEqual(result.visualInspection?.pages, [1, 2]);
      assert.ok(result.artDirector);
      assert.equal(
        result.assessmentProcess?.configuration.director.model,
        "openai/gpt-6-astra",
      );
      assert.ok(result.assessmentProcess?.estimatedCostUsd);
      const saved = JSON.stringify(result);
      assert.equal(await processOne(selected.id), false);
      assert.equal(calls, 3);
      assert.equal(
        JSON.stringify((await getReview(guest.user, selected.id)).result),
        saved,
      );
      assert.equal(
        (await startFramework(guest.user, root.id, "report")).id,
        selected.id,
      );
      assert.deepEqual(
        (await getReview(guest.user, old.id)).result,
        historical,
      );
      const finalSnapshot = await snapshot(privateRequest(), {
          params: Promise.resolve({ id: selected.id }),
        }),
        safe = await finalSnapshot.json();
      assert.equal(safe.result.artDirector, undefined);
      assert.equal(safe.result.qualityControl, undefined);
      assert.equal(safe.engine_state, undefined);
      assert.equal(calls, 3);
      const [shared] = await query<{ extraction_notes: unknown[] }>(
        "SELECT extraction_notes FROM director.reports WHERE id=$1",
        [reportId],
      );
      assert.deepEqual(shared.extraction_notes, notes);
      const output = await exportPdf(result);
      assert.ok(output.length > 5000);
      const exported = await extractPages(output);
      assert.match(exported.map((p) => p.text).join(" "), /AI art director/);
      assert.match(
        exported.map((p) => p.text).join(" "),
        /Saved assessment process/,
      );
    } finally {
      globalThis.fetch = original;
      if (oldDirector === undefined)
        delete process.env.IMPACT_EDIT_DIRECTOR_MODEL;
      else process.env.IMPACT_EDIT_DIRECTOR_MODEL = oldDirector;
      if (reportId)
        await query("DELETE FROM director.reports WHERE id=$1", [reportId]);
      await query("DELETE FROM director.access_sessions WHERE owner_id=$1", [
        guest.user.id,
      ]);
      await query("DELETE FROM director.users WHERE id=$1", [guest.user.id]);
      await database().end();
    }
  },
);
