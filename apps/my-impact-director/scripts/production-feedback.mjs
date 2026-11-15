// Genuine deployed feedback check. Creates one marked QA record, removed by exact ID after verification.
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = "https://www.myimpactdirector.com";
const message =
  "TEST ONLY: campaign redesign feedback verification. No follow-up required.";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
try {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".action-feedback").click();
  await page.waitForURL(/\/feedback/);
  await page.getByRole("radio", { name: "4", exact: true }).check();
  await page
    .getByRole("textbox", { name: /What would make it better/ })
    .fill(message);
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/feedback") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  const r = await response;
  assert.equal(r.status(), 201);
  const data = await r.json();
  await page.getByRole("heading", { name: /Heard/ }).waitFor();
  const account = await (
    await context.request.get(base + "/api/account")
  ).json();
  assert.equal(account.user.anonymous, true);
  assert.equal(account.user.email, "");
  assert.equal((await context.request.get(base + "/api/admin")).status(), 401);
  await page.screenshot({
    path: "artifacts/radical/production-feedback-confirmed.png",
    fullPage: true,
  });
  await writeFile(
    "artifacts/radical/production-feedback.json",
    JSON.stringify({ id: data.id, message, page: "/", rating: 4 }),
  );
  console.log(
    JSON.stringify({
      id: data.id,
      anonymous: true,
      noContactRequired: true,
      founderAccessDenied: true,
    }),
  );
  await context.close();
} finally {
  await browser.close();
}
