import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { POST as publishedReview } from "../app/api/published-review/route.ts";

const source = readFileSync(new URL("../app/sorp-candidate-review.tsx", import.meta.url), "utf8");

test("review feedback cannot send the published-review notification", async () => {
  const saveFeedback = source.slice(source.indexOf("async function saveFeedback("), source.indexOf("function go(step:", source.indexOf("async function saveFeedback(")));
  assert.doesNotMatch(saveFeedback, /post\(|fetch\(|report-email|operation:\s*["']feedback/);

  const originalFetch = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => { sends++; throw new Error("Review feedback reached an email endpoint"); };
  try {
    const request = new Request("https://mysocialimpact.org/api/published-review", {
      method: "POST",
      headers: { "content-type": "application/json", referer: "https://mysocialimpact.org/are-you-sorp-ready/review" },
      body: JSON.stringify({ operation: "feedback", sessionId: "review-session-123", rating: 5, phase: "quick" }),
    });
    const response = await publishedReview(request);
    assert.equal(response.status, 409);
    assert.equal(sends, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("every pre-final review stage is email-free and the final stage retains one guarded PDF send", () => {
  const preFinal = source.slice(source.indexOf("async function review("), source.indexOf("async function sendFinalReport("));
  assert.doesNotMatch(preFinal, /\/api\/readiness\/(?:review-)?report-email|api\.resend\.com\/emails/);
  const finalEffect = source.slice(source.indexOf("if (saved.step !== \"done\")"), source.indexOf("function event(type:", source.indexOf("if (saved.step !== \"done\")")));
  assert.match(finalEffect, /saved\.step !== "done"/);
  assert.match(finalEffect, /saved\.emailSent/);
  assert.match(finalEffect, /emailAttempt\.current === receiptKey/);
  const finalSend = source.slice(source.indexOf("async function sendFinalReport("), source.indexOf("async function contribute("));
  assert.match(finalSend, /saved\.step !== "done"/);
  assert.equal((finalSend.match(/post\("\/api\/readiness\/review-report-email"/g) || []).length, 1);
  assert.match(finalSend, /localStorage\.getItem\(receiptKey\) === "sent"/);
  assert.match(finalSend, /navigator\.locks\.request\(receiptKey, send\)/);
});
