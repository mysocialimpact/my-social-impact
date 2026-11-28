import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { feedbackInput, feedbackPage } from "../src/lib/feedback-input";
import {
  cost,
  budgetAllows,
  feedbackModel,
  analyseFeedback,
} from "../src/lib/feedback-analysis";
import { sendFeedbackMail } from "../src/lib/feedback-mail";
import { POST as submit } from "../src/app/api/feedback/route";
import {
  POST as update,
  GET as inbox,
} from "../src/app/api/admin/feedback/route";
import { createGuest } from "../src/lib/access";
import { database, query } from "../src/lib/db";
test("input accepts all ratings and comment-only, requires affirmative reply consent and strips private paths", () => {
  for (let rating = 1; rating <= 5; rating++)
    assert.ok(feedbackInput.safeParse({ rating, page: "/" }).success);
  assert.ok(
    feedbackInput.safeParse({
      comment: "A comment",
      page: "/",
      email: "reply@example.org",
      consent: true,
    }).success,
  );
  for (const extra of [
    {},
    { rating: 0 },
    { rating: 6 },
    { comment: "  " },
    { rating: 2, email: "reply@example.org" },
    { rating: 3, consent: true },
  ])
    assert.equal(
      feedbackInput.safeParse({ page: "/", ...extra }).success,
      false,
    );
  assert.equal(feedbackPage("/reviews/private"), "/reviews");
  assert.equal(feedbackPage("/unknown/secret"), "/feedback");
  assert.ok(
    feedbackInput.safeParse({
      comment: "Question",
      section: "criterion-claims.1.1",
      page: "/reviews",
    }).success,
  );
});
test("Astra budget reserves worst case spend and counts cached tokens", () => {
  assert.equal(cost(1000, 500, 100), 0.0082);
  assert.equal(budgetAllows(0.99, 1), false);
  assert.equal(budgetAllows(0, 0), false);
  assert.equal(budgetAllows(0, 1), true);
});
test(
  "private inbox, anonymous retries, guarded references, metered analysis and approved Resend delivery",
  { skip: process.env.RUN_FEEDBACK_DB !== "1", timeout: 180000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    const origin = "https://feedback-test.example";
    process.env.APP_ORIGIN = origin;
    const owner = "qa-feedback-" + randomUUID(),
      ids = [randomUUID(), randomUUID()];
    const original = globalThis.fetch;
    const guest = await createGuest(
      new Request(origin, { headers: { "x-forwarded-for": owner } }),
    );
    const cookie = guest.cookie!.split(";")[0];
    let generations = 0;
    const sent: { to: string[]; text: string }[] = [];
    globalThis.fetch = async (url, init) => {
      const path = String(url);
      if (path.includes("api/readiness-account"))
        return Response.json({
          signedIn: true,
          account: { id: owner, name: "Fixture", email: "fixture@example.org" },
          platformAccess: { founder: true },
        });
      if (path.endsWith("/models/" + feedbackModel))
        return Response.json({ id: feedbackModel });
      if (path.endsWith("/chat/completions")) {
        generations++;
        const body = JSON.parse(String(init?.body));
        assert.equal(body.model, feedbackModel);
        assert.equal(body.reasoning_effort, "high");
        assert.equal(body.store, false);
        assert.ok(!JSON.stringify(body.messages).includes("reply@example.org"));
        return Response.json({
          id: "fixture",
          model: feedbackModel,
          usage: { prompt_tokens: 200, completion_tokens: 40 },
          choices: [
            {
              message: {
                content: JSON.stringify({
                  categories: ["criticism"],
                  theme: "report accuracy",
                  summary: "Score challenged",
                  improvement: "Review the evidence",
                  humanReview: true,
                  draft: "Thank you for raising this.",
                }),
              },
            },
          ],
        });
      }
      if (path === "https://api.resend.com/emails") {
        sent.push(JSON.parse(String(init?.body)));
        assert.ok(new Headers(init?.headers).get("idempotency-key"));
        return Response.json({ id: randomUUID() });
      }
      throw Error("Unexpected external request");
    };
    function req(path: string, body?: object, session = cookie) {
      return new Request(origin + path, {
        method: body ? "POST" : "GET",
        headers: { origin, cookie: session, "x-forwarded-for": owner },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
    const founder = "msi_sorp_session=fixture",
      path = "/api/admin/feedback";
    try {
      assert.equal((await inbox(req(path))).status, 401);
      const star = { rating: 1, page: "/", requestId: ids[0] },
        comment = {
          comment: "I dispute this score. " + owner,
          section: "score",
          email: "reply@example.org",
          consent: true,
          page: "/feedback",
          requestId: ids[1],
        };
      assert.equal(
        (
          await submit(
            req("/api/feedback", { ...comment, reviewId: randomUUID() }),
          )
        ).status,
        404,
      );
      const pair = await Promise.all([
        submit(req("/api/feedback", star)),
        submit(req("/api/feedback", star)),
      ]);
      assert.deepEqual(pair.map((p) => p.status).sort(), [200, 201]);
      assert.equal(
        (await submit(req("/api/feedback", { ...star, rating: 2 }))).status,
        409,
      );
      assert.equal((await submit(req("/api/feedback", comment))).status, 201);
      process.env.OPENAI_API_KEY = "mock";
      process.env.FEEDBACK_AI_DAILY_USD = "0";
      await analyseFeedback(ids[0]);
      await analyseFeedback(ids[1]);
      assert.equal(generations, 0);
      process.env.FEEDBACK_AI_DAILY_USD = "1";
      await analyseFeedback(ids[1]);
      await analyseFeedback(ids[1]);
      assert.equal(generations, 1);
      const read = await inbox(
        req(path + "?response=drafted", undefined, founder),
      );
      assert.equal(read.status, 200);
      const data = await read.json();
      const row = data.items.find((r: { id: string }) => r.id === ids[1]);
      assert.ok(row.human_attention);
      assert.ok(row.draft);
      assert.equal(row.reply_state, null);
      assert.equal(data.metrics.ratings, 0);
      assert.equal(sent.length, 0);
      process.env.EMAIL_ENABLED = "true";
      process.env.RESEND_API_KEY = "mock";
      process.env.EMAIL_FROM = "fixture@example.org";
      await sendFeedbackMail(ids[1]);
      assert.equal(sent.length, 1);
      assert.ok(!sent[0].text.includes(comment.comment));
      assert.ok(!sent[0].text.includes(comment.email));
      const edit = {
        id: row.id,
        revision: row.revision,
        action: "approve",
        status: "reviewed",
        priority: "high",
        decision: "Review requested",
        draft: "Our team will review your question.",
      };
      assert.equal((await update(req(path, edit))).status, 401);
      assert.equal((await update(req(path, edit, founder))).status, 200);
      assert.equal((await update(req(path, edit, founder))).status, 409);
      await Promise.all([sendFeedbackMail(ids[1]), sendFeedbackMail(ids[1])]);
      assert.equal(sent.length, 2);
      assert.equal(sent[1].text, edit.draft);
      assert.deepEqual(sent[1].to, [comment.email]);
      const [usage] = await query(
        "SELECT input_tokens,output_tokens,cost_usd FROM director.feedback_ai_usage WHERE feedback_id=$1",
        [ids[1]],
      );
      assert.equal(usage.input_tokens, 200);
      assert.equal(Number(usage.cost_usd), cost(200, 0, 40));
    } finally {
      globalThis.fetch = original;
      await query(
        "DELETE FROM director.feedback_ai_usage WHERE feedback_id=ANY($1::uuid[])",
        [ids],
      );
      await query("DELETE FROM director.feedback WHERE id=ANY($1::uuid[])", [
        ids,
      ]);
      await query("DELETE FROM director.audit WHERE actor_id=$1", [owner]);
      await query("DELETE FROM director.access_sessions WHERE owner_id=$1", [
        guest.user.id,
      ]);
      await query("DELETE FROM director.users WHERE id=ANY($1::text[])", [
        [owner, guest.user.id],
      ]);
      await database().end();
    }
  },
);
test("a restricted key verifies the exact model without generating or selecting another model", async () => {
  const original = globalThis.fetch,
    key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "synthetic";
  try {
    const { feedbackModelStatus, verifyFeedbackModel } =
      await import("../src/lib/feedback-analysis");
    globalThis.fetch = async (url, init) => {
      if (String(url).endsWith("/models/" + feedbackModel))
        return new Response(null, { status: 403 });
      assert.equal(
        String(url),
        "https://api.openai.com/v1/responses/input_tokens",
      );
      assert.equal(JSON.parse(String(init?.body)).model, feedbackModel);
      return Response.json({
        object: "response.input_tokens",
        input_tokens: 2,
      });
    };
    assert.equal(await verifyFeedbackModel(), true);
    globalThis.fetch = async () =>
      Response.json({ error: { code: "model_not_found" } }, { status: 404 });
    assert.equal(
      await feedbackModelStatus(),
      "Directory HTTP 404 (model_not_found)",
    );
    assert.equal(await verifyFeedbackModel(), false);
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  }
});
