import { workspaces } from "../src/lib/workspace";
import { sendPendingReports } from "../src/lib/report-delivery";
import { GET as reviewGet } from "../src/app/api/reviews/[id]/route";
import { GET as exportGet } from "../src/app/api/reviews/[id]/export/route";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGuest,
  localIdentity,
  tokenHash,
  clearLocalSession,
} from "../src/lib/access";
import { requestEmailSave, redeemEmailLink } from "../src/lib/email-save";
import { visitor } from "../src/lib/auth";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { database, query } from "../src/lib/db";
import {
  createReview,
  getReview,
  sourceFile,
  deleteReview,
  retryReview,
  startFramework,
  reviewAccess,
} from "../src/lib/reviews";
import { processOne } from "../src/lib/pipeline";
import { exportPdf } from "../src/lib/export";
import { extractPages } from "../src/lib/documents";
import { identity, accountAction } from "../src/lib/auth";
import { POST as enquiryPost } from "../src/app/api/enquiries/route";
import { POST as feedbackPost } from "../src/app/api/feedback/route";
import { GET as adminGet } from "../src/app/api/admin/route";
import { POST as inspectPost } from "../src/app/api/admin/[id]/route";
import { GET as workerGet } from "../src/app/api/worker/route";
import { dailyUsageCost } from "../src/lib/security";
import { mkdir, writeFile } from "node:fs/promises";
import type { ReviewResult } from "../src/lib/pipeline";
const enabled = process.env.RUN_DATABASE_TESTS === "1";
test(
  "real database journey, account contracts, job recovery, private results, enquiry, founder consent, export and deletion",
  { skip: !enabled, timeout: 240000 },
  async (t) => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
      "Tests require the dedicated validation database.",
    );
    // Mock model calls must not consume or inherit the validation branch's real AI budget.
    const stageKey = createHash("sha256")
      .update("ai-stage:global")
      .digest("hex");
    const isolatedKeys = [stageKey, "ai-provider-backoff"];
    const priorLimits = await query<{
      key: string;
      count: number;
      reset_at: string;
    }>(
      "SELECT key,count,reset_at FROM director.rate_limits WHERE key=ANY($1::text[])",
      [isolatedKeys],
    );
    await query("DELETE FROM director.rate_limits WHERE key=ANY($1::text[])", [
      isolatedKeys,
    ]);
    const originalFetch = globalThis.fetch;
    process.env.REVIEWS_ENABLED = "true";
    process.env.AI_GATEWAY_API_KEY = "synthetic-contract-test-only";
    process.env.APP_ORIGIN = "https://test.example";
    const uid = "qa-" + randomUUID(),
      other = "qa-" + randomUUID(),
      founder = "qa-" + randomUUID();
    const user = {
        id: uid,
        name: "Synthetic QA",
        email: uid + "@example.invalid",
        founder: false,
      },
      otherUser = { ...user, id: other };
    const quote = "We trained 2,000 people during 2025.";
    const text =
      quote +
      " We have not measured changes in household income. The board approved follow-up interviews to learn whether participants benefited.";
    const localUsers: string[] = [];
    const emails: Record<string, any>[] = [];
    let aiCalls = 0,
      failAI = false,
      forgeQuote = false;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url === "https://api.resend.com/emails") {
        emails.push(JSON.parse(String(init?.body)));
        return Response.json({ id: "synthetic-email-receipt" });
      }
      if (url.includes("/api/readiness-account")) {
        const h = new Headers(init?.headers),
          cookie = h.get("cookie") || "";
        if (init?.method === "POST") {
          const b = JSON.parse(String(init.body));
          if (b.action === "login" || b.action === "signup")
            return Response.json(
              { sessionToken: "must-not-be-exposed", account: user },
              {
                status: 201,
                headers: {
                  "set-cookie":
                    "msi_sorp_session=synthetic; HttpOnly; Secure; SameSite=Lax; Path=/",
                },
              },
            );
          return Response.json({ ok: true });
        }
        if (!cookie.includes("msi_sorp_session="))
          return Response.json({ signedIn: false });
        const isFounder = cookie.includes("founder"),
          isOther = cookie.includes("other");
        return Response.json({
          signedIn: true,
          account: { ...user, id: isFounder ? founder : isOther ? other : uid },
          platformAccess: { founder: isFounder },
        });
      }
      if (url === "https://ai-gateway.vercel.sh/v1/chat/completions") {
        aiCalls++;
        const b = JSON.parse(String(init?.body));
        assert.equal(b.store, false);
        assert.equal(b.providerOptions.gateway.zeroDataRetention, true);
        assert.equal(b.tools, undefined);
        assert.match(b.messages[0].content, /UNTRUSTED DATA/);
        if (failAI)
          return Response.json(
            { error: { code: "rate_limit" } },
            { status: 429 },
          );
        const p = JSON.parse(b.messages[1].content[0].text);
        let data: unknown;
        if (p.physicalPages)
          data = {
            pages: p.physicalPages.map((page: number) => ({
              page,
              description:
                "Synthetic visual observation: clear type and consistent page layout.",
              limitations:
                "Synthetic visual contract, not professional judgement.",
              readable: true,
              ...(p.pdfChecks ? { contentKinds: [] } : {}),
            })),
          };
        else if (p.pageMapping)
          data = {
            pages: p.pageMapping.map((m: { original: number }) => ({
              page: m.original,
              text,
              extraction: "ocr",
              readable: true,
            })),
            observations: [],
          };
        else if (p.criteria)
          data = {
            findings: p.criteria.map((c: { id: string }) => ({
              id: c.id,
              status:
                p.anchors && c.id === "report.5.5"
                  ? "unassessable"
                  : p.anchors && c.id === "report.5.3"
                    ? "not_demonstrated"
                    : "assessed",
              score:
                p.anchors && c.id === "report.5.5"
                  ? null
                  : p.anchors && c.id === "report.5.3"
                    ? 0
                    : 3,
              explanation:
                "Synthetic fixture judgement for testing persistence, not professional calibration.",
              evidenceIds: [forgeQuote ? "INVENTED" : p.passages[0].id],
              limitations: ["Synthetic contract test."],
              improvement:
                "Publish the follow-up income measure and response rate.",
              confidence: "medium",
              claimIds: c.id.startsWith("report.") ? [] : ["C1"],
              ...(c.id.startsWith("report.")
                ? {
                    visualPages: [p.visualObservations[0].page],
                    ...(p.anchors
                      ? {
                          anchorReason:
                            "The synthetic fixture meets this anchor, not the higher anchor; this tests transport only.",
                          barrier: "none",
                        }
                      : {}),
                  }
                : {}),
            })),
          };
        else if (p.findings)
          data = {
            ...(p.pdfChecks
              ? {
                  editorial: {
                    verdict:
                      "Synthetic editorial verdict: this tests persistence and not professional calibration.",
                    attention:
                      "A synthetic attention judgement for transport validation only.",
                    scoreConsistency: "consistent",
                    scoreExplanation:
                      "Synthetic score consistency check; no claim of creative calibration.",
                    readerTest: Object.fromEntries(
                      ["outcomes", "scale", "limitations", "nextSteps"].map(
                        (k) => [
                          k,
                          {
                            finding:
                              "Synthetic answer for the reader test on the original physical page.",
                            page: p.visualObservations[0].page,
                            access: "easy",
                          },
                        ],
                      ),
                    ),
                  },
                }
              : {}),
            summary: "Synthetic review for the integration test.",
            strengths: ["Training reach is disclosed."],
            opportunities: ["Measure changes in income."],
            actions: [
              {
                priority: "quick",
                title: "Qualify the wording",
                detail:
                  "Describe attendance as reach, not proof of improved income.",
                criterionIds: [p.findings[0].id],
              },
              {
                priority: "important",
                title: "Add follow-up evidence",
                detail:
                  "Report household income at baseline and follow-up with response rates.",
                criterionIds: [p.findings[1].id],
              },
              {
                priority: "longer_term",
                title: "Establish a learning cycle",
                detail:
                  "Ask the board to review follow-up evidence at each reporting cycle.",
                criterionIds: [p.findings[2].id],
              },
            ],
          };
        else if (p.context)
          data = {
            claims: [
              {
                id: "C1",
                passageId: p.passages[0].id,
                classification: "output",
                outcome: "People attended training.",
                materiality: "high",
                evidenceIds: [p.passages[0].id],
                adequacy: "partial",
                causal: false,
                assumptions: ["No measured income outcome."],
                exaggerationRisk: "low",
                defensibleWording: "",
              },
            ],
          };
        else
          data = {
            organisation: "Synthetic QA Charity",
            title: "Synthetic 2025 impact report",
            reportingPeriod: "2025",
            beneficiaries: ["Training participants"],
            activities: ["Training"],
            outcomes: ["Not yet measured"],
            context: "Small charity reporting its training reach.",
            limitations: ["Synthetic calibration fixture."],
          };
        return Response.json({
          id: "synthetic-response",
          model: "openai/gpt-5.4-mini",
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(data) },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 100 },
        });
      }
      throw new Error(
        "Unexpected external request in integration suite: " + url,
      );
    };
    const req = (path: string, body?: unknown, cookie = "owner") =>
      new Request("https://test.example" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          origin: "https://test.example",
          "x-forwarded-for": uid,
          cookie: "msi_sorp_session=" + cookie,
          "content-type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const ids: string[] = [];
    try {
      await t.test(
        "server identity, founder role and registration/login cookies",
        async () => {
          assert.equal((await identity(req("/"))).id, uid);
          assert.equal((await identity(req("/", "", "founder"))).founder, true);
          await identity(req("/", "", "other"));
          for (const action of ["signup", "login"]) {
            const r = await accountAction(req("/api/account", {}), {
              action,
              email: user.email,
              password: "long-test-password",
              name: "QA User",
            });
            assert.equal(r.status, 201);
            assert.match(r.headers.get("set-cookie") || "", /HttpOnly/);
            assert.equal((await r.json()).sessionToken, undefined);
          }
        },
      );
      const pdf = await PDFDocument.create(),
        font = await pdf.embedFont(StandardFonts.Helvetica);
      pdf
        .addPage()
        .drawText(text, { font, size: 10, x: 40, y: 700, maxWidth: 500 });
      const bytes = Buffer.from(await pdf.save());
      const { id } = await createReview(user, bytes, "qa.pdf", true, false);
      ids.push(id);
      await t.test(
        "upload deduplication, source persistence and ownership",
        async () => {
          assert.equal(
            (await createReview(user, bytes, "same.pdf", true, false)).id,
            id,
          );
          assert.deepEqual(await sourceFile(user, id), bytes);
          await assert.rejects(() => getReview(otherUser, id));
          await assert.rejects(() => sourceFile(otherUser, id));
          await assert.rejects(() => deleteReview(otherUser, id));
        },
      );
      await t.test(
        "concurrent workers claim one lease, not two stages",
        async () => {
          await Promise.all([processOne(id), processOne(id)]);
          assert.equal((await getReview(user, id)).stage, 1);
        },
      );
      await t.test(
        "durable stages produce two validated frameworks and persist metadata",
        async () => {
          for (let i = 0; i < 20; i++) {
            const r = await getReview(user, id);
            if (r.status === "complete") break;
            assert.equal(await processOne(id), true);
          }
          const r = await getReview(user, id);
          assert.equal(r.status, "complete");
          await mkdir("artifacts", { recursive: true });
          await writeFile("artifacts/synthetic-review.json", JSON.stringify(r));
          const result = r.result as ReviewResult;
          assert.equal(result.scores.claims!.overall, 75);
          assert.equal(result.scores.excellence!.overall, 75);
          assert.equal(result.claims.length, 1);
          assert.ok(aiCalls >= 13);
          assert.equal(result.version, "1.0.0");
          assert.ok(Number(r.cost_usd) > 0);
          assert.equal(await processOne(id), false);
        },
      );
      await t.test(
        "branded multipage PDF contains both frameworks and citations",
        async () => {
          const r = await getReview(user, id),
            bytes = await exportPdf(r.result as ReviewResult);
          await mkdir("artifacts", { recursive: true });
          await writeFile("artifacts/synthetic-test-export.pdf", bytes);
          assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
          const pages = await extractPages(bytes);
          assert.ok(pages.length >= 5);
          const text = pages.map((p) => p.text).join(" ");
          assert.match(text, /Social Impact Claims Code/);
          assert.match(text, /Social Impact Excellence/);
          assert.match(text, /Methodology/);
          assert.match(text, /PDF p\. 1/);
        },
      );
      await t.test(
        "two selected methodologies reuse understanding and keep details behind verified access",
        async () => {
          for (const framework of ["claims", "excellence"] as const) {
            const selected = await startFramework(user, id, framework);
            assert.equal(
              (await startFramework(user, id, framework)).id,
              selected.id,
            );
            assert.equal(
              (await getReview(user, selected.id)).stage,
              framework === "claims" ? 4 : 9,
            );
            for (
              let i = 0;
              i < 7 &&
              (await getReview(user, selected.id)).status !== "complete";
              i++
            )
              assert.equal(await processOne(selected.id), true);
            const done = await getReview(user, selected.id),
              result = done.result as ReviewResult;
            assert.equal(done.status, "complete");
            assert.deepEqual(Object.keys(result.scores), [framework]);
            assert.equal(
              result.scores[framework]!.principles.flatMap((p) => p.tests)
                .length,
              20,
            );
            assert.equal(await reviewAccess(user, done), false);
            const response = await reviewGet(
              req("/api/reviews/" + selected.id),
              { params: Promise.resolve({ id: selected.id }) },
            );
            const snapshot = await response.json();
            assert.equal(snapshot.findings, undefined);
            assert.equal(snapshot.pages, null);
            assert.equal(
              snapshot.result.scores[framework].principles.flatMap(
                (p: any) => p.tests,
              ).length,
              0,
            );
            assert.equal(
              (
                await exportGet(
                  req("/api/reviews/" + selected.id + "/export"),
                  { params: Promise.resolve({ id: selected.id }) },
                )
              ).status,
              403,
            );
            await assert.rejects(() => getReview(otherUser, selected.id), {
              status: 404,
            });
            await writeFile(
              "artifacts/" + framework + "-review.json",
              JSON.stringify({ ...done, full: false, siblings: [] }, null, 2),
            );
          }
        },
      );
      await t.test(
        "verified delivery can be requested during processing and reused by the second review",
        async () => {
          process.env.EMAIL_ENABLED = "true";
          process.env.EMAIL_FROM = "QA <qa@example.invalid>";
          process.env.RESEND_API_KEY = "synthetic-contract-only";
          const selected = await startFramework(user, id, "claims"),
            savedResult = (await getReview(user, selected.id)).result;
          await query(
            "UPDATE director.reviews SET status='queued',result=NULL WHERE id=$1",
            [selected.id],
          );
          const recipient = uid + "-during@example.invalid";
          await requestEmailSave(req("/api/save"), {
            email: recipient,
            reviewId: selected.id,
          });
          assert.equal(emails.length, 1);
          assert.equal(emails[0].attachments, undefined);
          const token = emails[0].text.match(/access#([A-Za-z0-9_-]{43})/)![1];
          const redeemed = await redeemEmailLink(token);
          const verified = await visitor(
            new Request("https://test.example/api/account", {
              headers: { cookie: redeemed.cookie.split(";")[0] },
            }),
          );
          assert.equal(
            await reviewAccess(
              verified,
              await getReview(verified, selected.id),
            ),
            true,
          );
          await sendPendingReports();
          assert.equal(
            emails.length,
            2,
            "Already-complete Excellence is delivered immediately",
          );
          assert.match(emails[1].subject, /Excellence/);
          await query(
            "UPDATE director.reviews SET status='complete',result=$2 WHERE id=$1",
            [selected.id, JSON.stringify(savedResult)],
          );
          await query(
            "INSERT INTO director.report_deliveries(review_id,owner_id,email) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
            [selected.id, verified.id, recipient],
          );
          await sendPendingReports();
          assert.equal(emails.length, 3);
          assert.ok(emails[2].attachments[0].content);
          const second = await startFramework(
            verified,
            selected.id,
            "excellence",
          );
          assert.equal(
            await reviewAccess(verified, await getReview(verified, second.id)),
            true,
          );
          await sendPendingReports();
          assert.equal(emails.length, 3, "Delivery retries are idempotent");
          const verifiedRequest = new Request(
            "https://test.example/api/reviews/" + selected.id,
            { headers: { cookie: redeemed.cookie.split(";")[0] } },
          );
          const delivered = await (
            await reviewGet(verifiedRequest, {
              params: Promise.resolve({ id: selected.id }),
            })
          ).json();
          assert.equal(delivered.delivery.state, "accepted");
          const unverified = await (
            await reviewGet(req("/api/reviews/" + selected.id), {
              params: Promise.resolve({ id: selected.id }),
            })
          ).json();
          assert.equal(
            unverified.delivery,
            undefined,
            "Delivery information is private to the verified recipient",
          );
          await query(
            "UPDATE director.report_deliveries SET delivered_at=NULL,attempts=8 WHERE review_id=$1 AND owner_id=$2",
            [selected.id, verified.id],
          );
          const failedDelivery = await (
            await reviewGet(verifiedRequest, {
              params: Promise.resolve({ id: selected.id }),
            })
          ).json();
          assert.equal(failedDelivery.delivery.state, "failed");
          await sendPendingReports();
          assert.equal(
            emails.length,
            3,
            "Exhausted delivery waits for an explicit retry",
          );
          const extra = await createReview(
            verified,
            bytes,
            "reuse-verified.pdf",
            true,
            false,
            null,
            true,
          );
          const reused = await requestEmailSave(
            new Request("https://test.example/api/save", {
              headers: {
                cookie: redeemed.cookie.split(";")[0],
                origin: "https://test.example",
                "x-forwarded-for": uid,
              },
            }),
            { email: recipient, reviewId: extra.id },
          );
          assert.equal(reused?.verified, true);
          assert.equal(
            emails.length,
            3,
            "An already verified address needs no new confirmation email",
          );
          assert.equal(
            await reviewAccess(verified, await getReview(verified, extra.id)),
            true,
          );
          await deleteReview(verified, extra.id);
          await query("DELETE FROM director.email_links WHERE email=$1", [
            recipient,
          ]);
          await query("DELETE FROM director.users WHERE id=$1", [verified.id]);
          emails.length = 0;
        },
      );
      await t.test(
        "a new document is ingested once and stops before either assessment",
        async () => {
          const pdf = await PDFDocument.create();
          pdf.addPage().drawText(text + " Another report.", {
            size: 10,
            x: 40,
            y: 700,
            maxWidth: 500,
          });
          const doc = await createReview(
            user,
            Buffer.from(await pdf.save()),
            "new-document.pdf",
            true,
            false,
            null,
            true,
          );
          ids.push(doc.id);
          for (
            let i = 0;
            i < 6 && (await getReview(user, doc.id)).status !== "complete";
            i++
          )
            assert.equal(await processOne(doc.id), true);
          const done = await getReview(user, doc.id);
          assert.equal(done.framework, "document");
          assert.equal(done.stage, 4);
          assert.equal(done.result, null);
          assert.equal(done.understanding_ready, true);
          const events = await query<{ stage: number }>(
            "SELECT stage FROM director.processing_events WHERE review_id=$1",
            [doc.id],
          );
          assert.ok(events.every((e) => e.stage < 4));
          const selected = await startFramework(user, doc.id, "excellence");
          assert.equal((await getReview(user, selected.id)).stage, 9);
          await writeFile(
            "artifacts/document-review.json",
            JSON.stringify({
              ...done,
              full: false,
              siblings: [],
              emailEnabled: false,
            }),
          );
        },
      );
      await t.test(
        "anonymous sessions and optional email saving preserve private access, expiry and single-use links",
        async () => {
          const guestReq = (cookie = "") =>
            new Request("https://test.example/api/save", {
              headers: {
                cookie,
                origin: "https://test.example",
                "x-forwarded-for": uid,
              },
            });
          const a = await createGuest(guestReq()),
            b = await createGuest(guestReq());
          localUsers.push(a.user.id, b.user.id);
          const cookie = a.cookie!.split(";")[0];
          assert.equal((await visitor(guestReq(cookie))).anonymous, true);
          assert.equal(
            (await createGuest(guestReq(cookie))).user.id,
            a.user.id,
          );
          await assert.rejects(() => identity(guestReq(cookie)), {
            status: 401,
          });
          assert.equal(
            await localIdentity(
              guestReq("mid_access=" + randomBytes(32).toString("base64url")),
              true,
            ),
            null,
          );
          const guestReview = await createReview(
            a.user,
            bytes,
            "guest-contract.pdf",
            true,
            false,
          );
          ids.push(guestReview.id);
          // Use the explicitly synthetic, already validated result produced above.
          await query(
            "UPDATE director.reviews SET status='complete',stage=15,result=(SELECT result FROM director.reviews WHERE id=$2) WHERE id=$1",
            [guestReview.id, id],
          );
          const guestResult = await getReview(a.user, guestReview.id);
          assert.ok(
            new Date(String(guestResult.expires_at)).getTime() <
              Date.now() + 8 * 86400000,
          );
          await assert.rejects(() => getReview(b.user, guestReview.id), {
            status: 404,
          });
          await assert.rejects(() => sourceFile(b.user, guestReview.id), {
            status: 404,
          });
          process.env.EMAIL_ENABLED = "false";
          await assert.rejects(
            () =>
              requestEmailSave(guestReq(cookie), {
                email: "fixture@example.invalid",
                reviewId: guestReview.id,
              }),
            { status: 503 },
          );
          process.env.EMAIL_ENABLED = "true";
          process.env.EMAIL_FROM = "QA <qa@example.invalid>";
          process.env.RESEND_API_KEY = "synthetic-contract-only";
          const email = uid + "@example.invalid";
          await assert.rejects(
            () =>
              requestEmailSave(guestReq(b.cookie!.split(";")[0]), {
                email,
                reviewId: guestReview.id,
              }),
            { status: 404 },
          );
          await requestEmailSave(guestReq(cookie), {
            email,
            reviewId: guestReview.id,
          });
          assert.equal(emails.length, 1);
          assert.equal(
            emails[0].attachments,
            undefined,
            "No report is sent to an unverified address",
          );
          const token = emails[0].text.match(/access#([A-Za-z0-9_-]{43})/)![1];
          const redeemed = await redeemEmailLink(token);
          await sendPendingReports();
          assert.equal(
            Buffer.from(emails[1].attachments[0].content, "base64")
              .subarray(0, 5)
              .toString(),
            "%PDF-",
          );
          await sendPendingReports();
          assert.equal(emails.length, 2, "Delivery is idempotent");
          assert.equal(redeemed.destination, "/reviews/" + guestReview.id);
          const savedReq = guestReq(redeemed.cookie.split(";")[0]);
          const saved = await visitor(savedReq);
          localUsers.push(saved.id);
          assert.equal(saved.anonymous, false);
          assert.equal(saved.founder, false);
          const retained = await getReview(saved, guestReview.id);
          assert.ok(
            new Date(String(retained.expires_at)).getTime() >
              Date.now() + 179 * 86400000,
          );
          await assert.rejects(() => redeemEmailLink(token), { status: 410 });
          const expired = randomBytes(32).toString("base64url");
          await query(
            "INSERT INTO director.email_links(token_hash,owner_id,email,expires_at) VALUES($1,$2,$3,now()-interval '1 second')",
            [tokenHash(expired), a.user.id, email],
          );
          await assert.rejects(() => redeemEmailLink(expired), { status: 410 });
          await deleteReview(saved, guestReview.id);
          await assert.rejects(() => getReview(a.user, guestReview.id), {
            status: 404,
          });
          await clearLocalSession(savedReq);
          await assert.rejects(() => visitor(savedReq), { status: 401 });
          process.env.EMAIL_ENABLED = "false";
        },
      );
      await t.test(
        "founder restriction and detailed inspection consent",
        async () => {
          assert.equal((await adminGet(req("/api/admin"))).status, 403);
          assert.equal(
            (await adminGet(req("/api/admin", undefined, "founder"))).status,
            200,
          );
          const r = await inspectPost(
            req(
              "/api/admin/" + id,
              { reason: "Engineering quality verification" },
              "founder",
            ),
            { params: Promise.resolve({ id }) },
          );
          assert.equal(r.status, 403);
        },
      );
      await t.test(
        "enquiry permissions, consent and founder visibility",
        async () => {
          const body = {
            service: "expert-review",
            message: "Synthetic QA enquiry. No follow-up required.",
            reviewId: id,
            shareReview: true,
            contactConsent: true,
          };
          assert.equal(
            (await enquiryPost(req("/api/enquiries", body, "other"))).status,
            404,
          );
          const r = await enquiryPost(req("/api/enquiries", body));
          assert.equal(r.status, 201);
          const d = await (
            await adminGet(req("/api/admin", undefined, "founder"))
          ).json();
          assert.ok(
            d.enquiries.some((e: { review_id: string }) => e.review_id === id),
          );
          assert.equal(
            (
              await inspectPost(
                req(
                  "/api/admin/" + id,
                  { reason: "Engineering quality verification" },
                  "founder",
                ),
                { params: Promise.resolve({ id }) },
              )
            ).status,
            200,
          );
        },
      );
      await t.test(
        "ongoing support interests persist, filter and preserve review consent",
        async () => {
          const categories = [
            "human-director",
            "essentials",
            "supported",
            "director",
            "bespoke",
            "ai-readiness",
            "consultancy",
          ];
          for (const [index, service] of categories.entries()) {
            const network = `qa-support-${uid}-${index}`;
            const guest = await createGuest(
              new Request("https://test.example/api/visitor", {
                headers: { "x-forwarded-for": network },
              }),
            );
            localUsers.push(guest.user.id);
            const cookie = guest.cookie!.split(";")[0];
            const body = {
              service,
              message: "Synthetic support category QA, no follow-up.",
              reviewId: null,
              shareReview: false,
              contactConsent: true,
              name: "Support QA",
              email: "support@example.invalid",
            };
            const request = (data: unknown) =>
              new Request("https://test.example/api/enquiries", {
                method: "POST",
                headers: {
                  cookie,
                  origin: "https://test.example",
                  "content-type": "application/json",
                  "x-forwarded-for": network,
                },
                body: JSON.stringify(data),
              });
            if (service === "essentials") {
              assert.equal(
                (await enquiryPost(request(body))).status,
                400,
                "retired package cannot receive new enquiries",
              );
              const [legacy] = await query<{ id: string }>(
                "INSERT INTO director.enquiries(owner_id,service,message,contact_name,contact_email) VALUES($1,'essentials','Historical retired-package enquiry','Support QA','support@example.invalid') RETURNING id",
                [guest.user.id],
              );
              const historical = await (
                await adminGet(
                  req("/api/admin?service=essentials", undefined, "founder"),
                )
              ).json();
              assert.ok(
                historical.enquiries.some(
                  (e: { id: string }) => e.id === legacy.id,
                ),
                "historical retired-package enquiries remain visible",
              );
              continue;
            }
            assert.equal(
              (
                await enquiryPost(
                  request({ ...body, reviewId: id, shareReview: true }),
                )
              ).status,
              404,
              "a query-string review ID grants no access",
            );
            assert.equal(
              (await enquiryPost(request({ ...body, contactConsent: false })))
                .status,
              400,
            );
            assert.equal(
              (
                await enquiryPost(
                  request({ ...body, service: "unlimited-board-attendance" }),
                )
              ).status,
              400,
            );
            const response = await enquiryPost(request(body));
            assert.equal(response.status, 201, service);
            const saved = await response.json();
            const [row] = await query<{
              service: string;
              share_review: boolean;
              review_id: string | null;
            }>(
              "SELECT service,share_review,review_id FROM director.enquiries WHERE id=$1",
              [saved.id],
            );
            assert.equal(row.service, service);
            assert.equal(row.share_review, false);
            assert.equal(row.review_id, null);
            const filtered = await (
              await adminGet(
                req(`/api/admin?service=${service}`, undefined, "founder"),
              )
            ).json();
            assert.ok(
              filtered.enquiries.some((e: { id: string }) => e.id === saved.id),
            );
            assert.ok(
              filtered.enquiries.every(
                (e: { service: string }) => e.service === service,
              ),
            );
          }
          const grouped = await (
            await adminGet(
              req("/api/admin?service=ongoing", undefined, "founder"),
            )
          ).json();
          assert.ok(grouped.enquiries.length >= 5);
          assert.ok(
            grouped.enquiries.every((e: { service: string }) =>
              categories.slice(0, 5).includes(e.service),
            ),
          );
          assert.equal(
            (
              await adminGet(
                req("/api/admin?service=ongoing", undefined, "other"),
              )
            ).status,
            403,
          );
        },
      );
      await t.test(
        "anonymous feedback is validated, private and visible only to founders",
        async () => {
          const guest = await createGuest(
            new Request("https://test.example/api/visitor"),
          );
          localUsers.push(guest.user.id);
          const cookie = guest.cookie!.split(";")[0];
          const feedbackReq = (
            body: unknown,
            origin = "https://test.example",
          ) =>
            new Request("https://test.example/api/feedback", {
              method: "POST",
              headers: {
                cookie,
                origin,
                "x-forwarded-for": uid,
                "content-type": "application/json",
              },
              body: JSON.stringify(body),
            });
          const body = {
            rating: 4,
            comment: "Synthetic feedback. No follow-up required.",
            page: "/review",
          };
          assert.equal(
            (await feedbackPost(feedbackReq(body, "https://other.example")))
              .status,
            403,
          );
          assert.equal(
            (await feedbackPost(feedbackReq({ ...body, rating: 6 }))).status,
            400,
          );
          assert.equal(
            (
              await feedbackPost(
                feedbackReq({ ...body, page: "//other.example" }),
              )
            ).status,
            400,
          );
          const response = await feedbackPost(feedbackReq(body));
          assert.equal(response.status, 201);
          const { id: feedbackId } = await response.json();
          const [row] = await query(
            "SELECT * FROM director.enquiries WHERE id=$1",
            [feedbackId],
          );
          assert.equal(row.service, "feedback");
          assert.equal(row.share_review, false);
          assert.equal(row.review_id, null);
          assert.equal(row.contact_email, "");
          assert.match(String(row.message), /Usefulness: 4\/5/);
          assert.equal(
            (
              await adminGet(
                new Request("https://test.example/api/admin", {
                  headers: { cookie },
                }),
              )
            ).status,
            401,
          );
          const admin = await (
            await adminGet(req("/api/admin", undefined, "founder"))
          ).json();
          assert.ok(
            admin.enquiries.some((e: { id: string }) => e.id === feedbackId),
          );
        },
      );
      await t.test(
        "failed stages retry with backoff without inventing results",
        async () => {
          const pdf2 = await PDFDocument.create();
          pdf2.addPage().drawText(text + " Retry case.", {
            size: 10,
            x: 40,
            y: 700,
            maxWidth: 500,
          });
          const r = await createReview(
            user,
            Buffer.from(await pdf2.save()),
            "retry.pdf",
            true,
            false,
          );
          ids.push(r.id);
          await processOne(r.id);
          failAI = true;
          assert.equal(await processOne(r.id), false);
          let saved = await getReview(user, r.id);
          assert.equal(saved.status, "queued");
          assert.equal(saved.stage, 1);
          assert.equal(saved.result, null);
          assert.equal(await processOne(r.id), false);
          failAI = false;
          await query(
            "DELETE FROM director.rate_limits WHERE key='ai-provider-backoff'",
          );
          await query(
            "UPDATE director.reviews SET next_attempt_at=now() WHERE id=$1",
            [r.id],
          );
          assert.equal(await processOne(r.id), true);
          saved = await getReview(user, r.id);
          assert.equal(saved.stage, 2);
          assert.equal(saved.stage_attempts, 0);
        },
      );
      await t.test(
        "citation validation prevents publication of invented source text",
        async () => {
          const id2 = ids.at(-1)!;
          await processOne(id2);
          await processOne(id2);
          forgeQuote = true;
          assert.equal(await processOne(id2), false);
          const r = await getReview(user, id2);
          assert.equal(r.stage, 4);
          assert.equal(r.result, null);
          assert.equal(r.error_code, "UNVERIFIED_QUOTATION");
          forgeQuote = false;
        },
      );
      await t.test(
        "worker endpoints reject missing or wrong credentials",
        async () => {
          assert.equal((await workerGet(req("/api/worker"))).status, 401);
          assert.equal(
            (
              await workerGet(
                new Request("https://test.example/api/worker", {
                  headers: { authorization: "Bearer wrong" },
                }),
              )
            ).status,
            401,
          );
        },
      );
      await t.test(
        "third visual framework reuses the report and persists twenty-five independent findings",
        async () => {
          const selected = await startFramework(user, id, "report");
          assert.equal(
            (await startFramework(user, id, "report")).id,
            selected.id,
          );
          const before = (
            await query<{ n: string }>(
              "SELECT count(*) AS n FROM director.reports WHERE id=(SELECT report_id FROM director.reviews WHERE id=$1)",
              [id],
            )
          )[0].n;
          for (
            let i = 0;
            i < 16 &&
            (await getReview(user, selected.id)).status !== "complete";
            i++
          )
            assert.equal(await processOne(selected.id), true);
          const done = await getReview(user, selected.id),
            result = done.result as ReviewResult;
          assert.equal(done.status, "complete");
          assert.equal(result.framework, "report");
          assert.equal(result.scores.report!.coverage, 24);
          assert.equal(result.scores.report!.overall, 72.19);
          assert.equal(result.version, "2.0.0");
          assert.ok(result.editorial);
          assert.notEqual(result.rating?.label, "Excellent");
          assert.ok(result.visualInspection!.pages.length);
          assert.equal(result.scores.claims, undefined);
          assert.equal(result.scores.excellence, undefined);
          assert.equal(
            (
              await query<{ n: string }>(
                "SELECT count(*) AS n FROM director.reports WHERE id=(SELECT report_id FROM director.reviews WHERE id=$1)",
                [id],
              )
            )[0].n,
            before,
          );
          assert.equal(
            (
              await reviewGet(req("/api/reviews/" + selected.id), {
                params: Promise.resolve({ id: selected.id }),
              })
            ).status,
            200,
          );
          await assert.rejects(() => getReview(otherUser, selected.id), {
            status: 404,
          });
          const pdf = await exportPdf(result),
            pdfPages = await extractPages(pdf);
          assert.match(
            pdfPages.map((p) => p.text).join(" "),
            /Visual inspection coverage/,
          );
          const exportedText = pdfPages.map((p) => p.text).join(" ");
          assert.match(exportedText, /The Impact Edit/);
          assert.match(exportedText, /Indicative Creative Assessment/);
          assert.match(
            exportedText,
            /Creative judgements are partly subjective/,
          );
          process.env.EMAIL_ENABLED = "true";
          const sentBefore = emails.length;
          await query(
            "INSERT INTO director.report_deliveries(review_id,owner_id,email) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
            [selected.id, uid, user.email],
          );
          await sendPendingReports();
          assert.equal(emails.length, sentBefore + 1);
          assert.equal(
            emails.at(-1)!.subject,
            "The Impact Edit — your review is ready",
          );
          assert.match(
            emails.at(-1)!.text,
            /An Impact Report Excellence assessment developed by My Social Impact/,
          );
          assert.match(
            emails.at(-1)!.text,
            /Creative judgements are partly subjective/,
          );
          assert.ok(emails.at(-1)!.attachments[0].content);
          await writeFile(
            "artifacts/report-review.json",
            JSON.stringify({ ...done, full: false, siblings: [] }, null, 2),
          );
        },
      );
      await t.test(
        "passwordless workspace associates a current report, deduplicates accounts and automatically saves future uploads",
        async () => {
          process.env.EMAIL_ENABLED = "true";
          process.env.EMAIL_FROM = "QA <qa@example.invalid>";
          process.env.RESEND_API_KEY = "synthetic-contract-only";
          const guest = await createGuest(
            new Request("https://test.example/api/visitor", {
              headers: { "x-forwarded-for": "dashboard-" + uid },
            }),
          );
          localUsers.push(guest.user.id);
          const cookie = guest.cookie!.split(";")[0];
          const guestReq = () =>
            new Request("https://test.example/api/save", {
              headers: { cookie, "x-forwarded-for": "dashboard-" + uid },
            });
          const parent = await createReview(
            guest.user,
            bytes,
            "workspace.pdf",
            true,
            false,
            null,
            true,
          );
          ids.push(parent.id);
          const selected = await startFramework(
            guest.user,
            parent.id,
            "claims",
          );
          let [w] = await workspaces(guest.user, parent.id);
          assert.equal((w.assessments as any[]).length, 1);
          assert.equal((w.assessments as any[])[0].has_result, false);
          assert.equal((w.assessments as any[])[0].status, "queued");
          await assert.rejects(() => workspaces(otherUser, parent.id), {
            status: 404,
          });
          const email = uid + "-workspace@example.invalid",
            before = emails.length;
          await requestEmailSave(guestReq(), {
            email,
            reviewId: parent.id,
            account: true,
          });
          assert.equal(emails.length, before + 1);
          assert.equal(emails.at(-1)!.attachments, undefined);
          assert.equal(
            (
              await query(
                "SELECT id FROM director.users WHERE email=$1 AND NOT is_anonymous",
                [email],
              )
            ).length,
            0,
          );
          const token = emails
            .at(-1)!
            .text.match(/access#([A-Za-z0-9_-]{43})/)![1];
          const redeemed = await redeemEmailLink(token);
          const verifiedReq = () =>
            new Request("https://test.example/api/save", {
              headers: {
                cookie: redeemed.cookie.split(";")[0],
                "x-forwarded-for": "dashboard2-" + uid,
              },
            });
          const verified = await visitor(verifiedReq());
          localUsers.push(verified.id);
          assert.equal(verified.emailVerified, true);
          [w] = await workspaces(verified, parent.id);
          assert.equal(w.full, true);
          assert.equal((w.assessments as any[])[0].id, selected.id);
          assert.equal(
            (
              await createReview(
                verified,
                bytes,
                "workspace.pdf",
                true,
                false,
                null,
                true,
              )
            ).id,
            parent.id,
            "cross-device re-upload reuses authorised source",
          );
          const pdf3 = await PDFDocument.create();
          pdf3.addPage().drawText("Another document saved automatically.");
          const fresh = await createReview(
            verified,
            Buffer.from(await pdf3.save()),
            "another.pdf",
            true,
            false,
            null,
            true,
          );
          ids.push(fresh.id);
          assert.equal(
            await reviewAccess(verified, await getReview(verified, fresh.id)),
            true,
          );
          assert.equal(
            (
              await query(
                "SELECT 1 FROM director.report_subscriptions WHERE report_id=(SELECT report_id FROM director.reviews WHERE id=$1) AND owner_id=$2",
                [fresh.id, verified.id],
              )
            ).length,
            1,
          );
          const count = emails.length;
          assert.equal(
            (
              await requestEmailSave(verifiedReq(), {
                email,
                reviewId: parent.id,
              })
            )?.verified,
            true,
          );
          assert.equal(emails.length, count);
          await requestEmailSave(guestReq(), { email, account: true });
          const secondToken = emails
            .at(-1)!
            .text.match(/access#([A-Za-z0-9_-]{43})/)![1];
          await redeemEmailLink(secondToken);
          assert.equal(
            (
              await query(
                "SELECT id FROM director.users WHERE email=$1 AND NOT is_anonymous",
                [email],
              )
            ).length,
            1,
          );
          await assert.rejects(() => redeemEmailLink(token), { status: 410 });
          const summary = JSON.stringify(await workspaces(verified));
          assert.ok(
            !summary.includes("file_bytes") && !summary.includes("findings"),
          );
          await writeFile(
            "artifacts/workspace-dashboard.json",
            JSON.stringify({ workspace: w, user: verified }, null, 2),
          );
        },
      );
      await t.test(
        "deletion removes report, result and private source, preserving unlinked enquiry",
        async () => {
          await deleteReview(user, id);
          await assert.rejects(() => getReview(user, id));
          await assert.rejects(() => sourceFile(user, id));
          const [e] = await query<{ review_id: string | null }>(
            "SELECT review_id FROM director.enquiries WHERE owner_id=$1",
            [uid],
          );
          assert.equal(e.review_id, null);
          assert.ok(
            (await dailyUsageCost()) > 0,
            "deletion cannot erase aggregate spend",
          );
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
      await query(
        "DELETE FROM director.rate_limits WHERE key=ANY($1::text[])",
        [isolatedKeys],
      );
      for (const row of priorLimits)
        await query(
          "INSERT INTO director.rate_limits(key,count,reset_at) VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET count=$2,reset_at=$3",
          [row.key, row.count, row.reset_at],
        );
      for (const id of ids) {
        await query(
          "DELETE FROM director.reports WHERE id IN (SELECT report_id FROM director.reviews WHERE id=$1)",
          [id],
        );
      }
      await query(
        "DELETE FROM director.enquiries WHERE owner_id=ANY($1::text[])",
        [[uid, other, founder, ...localUsers]],
      );
      await query("DELETE FROM director.audit WHERE actor_id=ANY($1::text[])", [
        [uid, other, founder],
      ]);
      await query("DELETE FROM director.users WHERE id=ANY($1::text[])", [
        [uid, other, founder, ...localUsers],
      ]);
      await database().end();
    }
  },
);
