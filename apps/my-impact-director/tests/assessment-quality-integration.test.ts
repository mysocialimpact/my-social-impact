import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createGuest } from "../src/lib/access";
import { createReview, startFramework, getReview } from "../src/lib/reviews";
import { query, database } from "../src/lib/db";
import { extractPages } from "../src/lib/documents";
import { criteria } from "../src/lib/rubric";
import { processOne } from "../src/lib/pipeline";
import { REPORT_VERSION } from "../src/lib/report-methodology";
import type { ReviewResult } from "../src/lib/pipeline";
test(
  "real persisted revised pipeline audits criterion execution, retains provenance and withholds an inconsistent total",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 90000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    process.env.REVIEWS_ENABLED = "true";
    process.env.AI_GATEWAY_API_KEY = "synthetic-contract-only";
    const original = globalThis.fetch;
    let inconsistent = false,
      auditCalls = 0;
    const claimsEntered = Promise.withResolvers<void>(),
      continueClaims = Promise.withResolvers<void>();
    let pauseClaims = false;
    const answer = {
      finding:
        "The relevant answer is visible on the inspected physical source page.",
      page: 1,
      access: "easy",
    };
    const context = {
      organisation: "Synthetic editorial QA",
      title: "Synthetic editorial QA",
      reportingPeriod: "2025",
      beneficiaries: [],
      activities: [],
      outcomes: [],
      context: "Synthetic validation only.",
      limitations: ["Not a real professional assessment."],
    };
    globalThis.fetch = async (input, init) => {
      assert.equal(
        String(input),
        "https://ai-gateway.vercel.sh/v1/chat/completions",
      );
      const body = JSON.parse(String(init?.body)),
        p = JSON.parse(body.messages[1].content[0].text);
      let data: Record<string, unknown>;
      if (p.physicalPages)
        data = {
          pages: p.physicalPages.map((page: number) => ({
            page,
            description:
              "Synthetic inspected page with readable type and structured content.",
            limitations: "Synthetic visual contract only.",
            readable: true,
            contentKinds: [],
          })),
        };
      else if (p.observations && p.pages)
        data = {
          firstImpression:
            "Synthetic first impression grounded in the inspected source page.",
          readingExperience:
            "Synthetic reading experience to verify persisted engine behaviour.",
          accessibilityConcerns: [],
          scan: {
            purpose: answer,
            difference: answer,
            achievements: answer,
            challenges: answer,
            nextSteps: answer,
          },
        };
      else if (p.criteria) {
        const audited = p.criteria.length === 25;
        if (audited) auditCalls++;
        assert.ok(
          body.messages[1].content.some(
            (c: { type: string }) => c.type === "image_url",
          ),
        );
        data = {
          findings: p.criteria.map((c: { id: string }) => ({
            id: c.id,
            status: "assessed",
            score: audited ? 2 : 3,
            explanation:
              "A synthetic finding tests criterion correction and aggregation only.",
            evidenceIds: [p.passages[0].id],
            visualPages: [1],
            anchorReason: audited
              ? "Routine formatting supports adequate execution, not the stronger anchor."
              : "Synthetic initial judgement, awaiting the criterion quality audit.",
            barrier: "none",
            limitations: ["Synthetic model contract."],
            improvement: "Bring the main findings forward.",
            confidence: "medium",
            claimIds: [],
          })),
        };
      } else if (p.findings)
        data = {
          summary: "Synthetic validated editorial summary.",
          strengths: ["Readable source text."],
          opportunities: ["Strengthen hierarchy."],
          actions: [0, 1, 2].map((i) => ({
            priority: "quick",
            title: "Improve finding " + i,
            detail: "Make the main findings easier to understand.",
            criterionIds: [p.findings[i].id],
          })),
          editorial: {
            verdict:
              "A synthetic editorial verdict verifies persistence, not professional calibration.",
            attention:
              "A synthetic reading judgement tests only the engine contract.",
            scoreConsistency: inconsistent ? "review_needed" : "consistent",
            scoreExplanation:
              "Synthetic consistency decision used to test publication safeguards.",
            readerTest: {
              outcomes: answer,
              scale: answer,
              limitations: answer,
              nextSteps: answer,
            },
          },
        };
      else throw Error("Unexpected model stage");
      if (p.findings && p.scores?.claims) {
        delete data.editorial;
        if (pauseClaims) {
          claimsEntered.resolve();
          await continueClaims.promise;
        }
      }
      return Response.json({
        choices: [
          { finish_reason: "stop", message: { content: JSON.stringify(data) } },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0 },
        model: "synthetic-no-network",
      });
    };
    const guest = await createGuest(
      new Request("https://test.example", {
        headers: { "x-forwarded-for": "quality-" + randomUUID() },
      }),
    );
    let reportId: string | undefined;
    try {
      const pdf = await PDFDocument.create(),
        font = await pdf.embedFont(StandardFonts.Helvetica);
      pdf
        .addPage()
        .drawText(
          "A synthetic report states its purpose and important findings clearly.",
          { x: 40, y: 700, size: 12, font },
        );
      const bytes = Buffer.from(await pdf.save()),
        pages = await extractPages(bytes);
      const root = await createReview(
        guest.user,
        bytes,
        "editorial-qa.pdf",
        true,
        false,
        null,
        true,
      );
      reportId = String((await getReview(guest.user, root.id)).report_id);
      await query(
        "UPDATE director.reports SET understanding_ready=true,understanding_context=$2,understanding_claims=$3,pages=$4 WHERE id=$1",
        [reportId, JSON.stringify(context), "[]", JSON.stringify(pages)],
      );
      const selected = await startFramework(guest.user, root.id, "report");
      for (
        let i = 0;
        i < 12 &&
        (await getReview(guest.user, selected.id)).status !== "complete";
        i++
      )
        assert.equal(
          await processOne(selected.id),
          true,
          JSON.stringify((await getReview(guest.user, selected.id)).error_code),
        );
      let done = (await getReview(guest.user, selected.id))
        .result as ReviewResult;
      assert.equal(done.version, REPORT_VERSION);
      assert.equal(done.scores.report?.overall, null);
      assert.equal(done.qualityControl?.calculatedOverall, 50);
      assert.ok(done.publicationNotice);
      assert.equal(done.qualityControl?.changes.length, 25);
      assert.equal(auditCalls, 1);
      assert.ok(done.readerInspection);
      assert.equal(done.beta, true);
      const events = await query<{ stage: number }>(
        "SELECT stage FROM director.processing_events WHERE review_id=$1 AND status=$2",
        [selected.id, "complete"],
      );
      assert.ok(events.some((e) => e.stage === 22));
      assert.ok(events.some((e) => e.stage === 23));
      // An independent assessment must not overwrite observations committed
      // while its model call was in flight.
      const claims = await startFramework(guest.user, root.id, "claims");
      const sourceFindings = done.scores.report!.principles.flatMap(
        (p) => p.tests,
      );
      const claimFindings = criteria("claims").map((c, i) => ({
        ...sourceFindings[i],
        id: c.id,
        score: 3,
      }));
      await query(
        "UPDATE director.reviews SET stage=14,context=$2,claims='[]',findings=$3 WHERE id=$1",
        [claims.id, JSON.stringify(context), JSON.stringify(claimFindings)],
      );
      pauseClaims = true;
      const runningClaims = processOne(claims.id);
      await claimsEntered.promise;
      await query(
        "UPDATE director.reports SET extraction_notes=extraction_notes || $2::jsonb WHERE id=$1",
        [
          reportId,
          JSON.stringify([
            {
              kind: "qa-concurrent-observation",
              page: 1,
              description:
                "An observation added while another review was in flight.",
            },
          ]),
        ],
      );
      continueClaims.resolve();
      assert.equal(await runningClaims, true);
      const [shared] = await query<{ extraction_notes: { kind: string }[] }>(
        "SELECT extraction_notes FROM director.reports WHERE id=$1",
        [reportId],
      );
      assert.ok(
        shared.extraction_notes.some(
          (n) => n.kind === "qa-concurrent-observation",
        ),
      );
      const claimResult = (await getReview(guest.user, claims.id))
        .result as ReviewResult;
      assert.equal(claimResult.version, "1.0.0");
      assert.equal(claimResult.scores.claims?.overall, 75);
      inconsistent = true;
      await query(
        "UPDATE director.reviews SET stage=14,status='queued',result=NULL WHERE id=$1",
        [selected.id],
      );
      assert.equal(await processOne(selected.id), true);
      done = (await getReview(guest.user, selected.id)).result as ReviewResult;
      assert.equal(done.scores.report?.overall, null);
      assert.equal(done.scores.report?.provisional, true);
      assert.ok(
        done.scores.report?.principles.every((p) =>
          p.tests.every((f) => f.score === 2),
        ),
      );
    } finally {
      globalThis.fetch = original;
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
