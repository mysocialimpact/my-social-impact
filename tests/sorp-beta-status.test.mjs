import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the review keeps beta visible and explains it only where relevant", async () => {
  const [review, introduction, homework] = await Promise.all([
    readFile(new URL("../app/sorp-candidate-review.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sorp-introduction.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sorp-homework-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(review, /Are You SORP Ready\? <small className="scr-beta-badge">BETA<\/small>/);
  assert.doesNotMatch(introduction, /\bbeta\b/i);
  assert.match(review, /HELP US IMPROVE THE BETA/);
  assert.match(review, /This is still a new tool, and your feedback directly helps us improve the experience for the next charity/);
  assert.match(review, /Thank you\. This genuinely helps us improve the beta\./);
  assert.match(homework, /This tool is still in beta\. Unusual delays like this help us identify where the experience needs to improve\./);
  assert.match(review, /Thanks for helping us improve Are You SORP Ready\? while it’s in beta\./);
  assert.match(review, /productStatus: "BETA"/);
});
