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
import { randomUUID, randomBytes } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { database, query } from "../src/lib/db";
import {
  createReview,
  getReview,
  sourceFile,
  deleteReview,
  retryReview,
} from "../src/lib/reviews";
import { processOne } from "../src/lib/pipeline";
import { exportPdf } from "../src/lib/export";
import { extractPages } from "../src/lib/documents";
import { identity, accountAction } from "../src/lib/auth";
import { POST as enquiryPost } from "../src/app/api/enquiries/route";
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
        email: "qa@example.invalid",
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
        if (p.pageMapping)
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
              status: "assessed",
              score: 3,
              explanation:
                "Synthetic fixture judgement for testing persistence, not professional calibration.",
              evidenceIds: [forgeQuote ? "INVENTED" : p.passages[0].id],
              limitations: ["Synthetic contract test."],
              improvement:
                "Publish the follow-up income measure and response rate.",
              confidence: "medium",
              claimIds: ["C1"],
            })),
          };
        else if (p.findings)
          data = {
            summary: "Synthetic review for the integration test.",
            strengths: ["Training reach is disclosed."],
            opportunities: ["Measure changes in income."],
            actions: [
              {
                priority: "quick",
                title: "Qualify the wording",
                detail:
                  "Describe attendance as reach, not proof of improved income.",
                criterionIds: ["claims.1.1"],
              },
              {
                priority: "important",
                title: "Add follow-up evidence",
                detail:
                  "Report household income at baseline and follow-up with response rates.",
                criterionIds: ["excellence.3.1"],
              },
              {
                priority: "longer_term",
                title: "Establish a learning cycle",
                detail:
                  "Ask the board to review follow-up evidence at each reporting cycle.",
                criterionIds: ["claims.5.2"],
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
          assert.equal(result.scores.claims.overall, 75);
          assert.equal(result.scores.excellence.overall, 75);
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
            Buffer.from(emails[0].attachments[0].content, "base64")
              .subarray(0, 5)
              .toString(),
            "%PDF-",
          );
          const token = emails[0].text.match(/access#([A-Za-z0-9_-]{43})/)![1];
          const redeemed = await redeemEmailLink(token);
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
      for (const id of ids) {
        await query(
          "DELETE FROM director.reports WHERE id IN (SELECT report_id FROM director.reviews WHERE id=$1)",
          [id],
        );
      }
      await query(
        "DELETE FROM director.enquiries WHERE owner_id=ANY($1::text[])",
        [[uid, other, founder]],
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
