import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const config = JSON.parse(await readFile(process.argv[2], "utf8")),
  { id } = JSON.parse(
    await readFile("/workspace/mid-live-review.json", "utf8"),
  );
const browser = await chromium.launch({
  executablePath: process.env.QA_BROWSER || undefined,
  args: ["--no-sandbox"],
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
try {
  const context = await browser.newContext({
      storageState: "/workspace/mid-live-qa-state.json",
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  const source = await context.request.get(
    config.url + `/api/reviews/${id}/source`,
  );
  assert.equal(source.status(), 200);
  const original = await readFile(
    "artifacts/real-reports/small-charity-support-2024.pdf",
  );
  assert.equal(
    createHash("sha256")
      .update(await source.body())
      .digest("hex"),
    createHash("sha256").update(original).digest("hex"),
  );
  await page.goto(config.url + `/services/expert-review?review=${id}`, {
    waitUntil: "networkidle",
  });
  await page
    .getByLabel("How can we help?")
    .fill(
      "TEST ONLY: live end-to-end verification of My Impact Director. No contact or follow-up is requested.",
    );
  await page.getByRole("checkbox", { name: /Share the linked/ }).check();
  await page
    .getByRole("checkbox", { name: /may respond to this enquiry/ })
    .check();
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/enquiries") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  assert.equal((await response).status(), 201);
  await page.getByRole("heading", { name: "Your enquiry is saved." }).waitFor();
  await page.screenshot({
    path: "artifacts/live/enquiry-confirmed-mobile.png",
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      sourceIntegrity: true,
      liveEnquirySaved: true,
      reviewId: id,
    }),
  );
} finally {
  await browser.close();
}
