import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";

const base = "https://www.myimpactdirector.com";
const account = JSON.parse(await readFile(process.argv[2], "utf8"));
const directory = "artifacts/production";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.QA_BROWSER || undefined,
  args: ["--no-sandbox"],
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const checks = [];
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const health = await context.request.get(base + "/api/health");
  assert.equal(health.status(), 200);
  assert.deepEqual(await health.json(), {
    status: "ok",
    reviewsEnabled: false,
  });
  checks.push("production database health and paused reviews");
  const redirect = await context.request.get(
    "https://myimpactdirector.com/methodology",
    { maxRedirects: 0 },
  );
  assert.equal(redirect.status(), 308);
  assert.equal(redirect.headers().location, base + "/methodology");
  checks.push("HTTPS apex redirect preserves path");
  for (const [path, status] of [
    ["/api/worker", 401],
    ["/api/reviews", 401],
    ["/api/admin", 401],
  ]) {
    assert.equal((await context.request.get(base + path)).status(), status);
  }
  checks.push("private endpoints deny unauthenticated access");
  const sitemap = await context.request.get(base + "/sitemap.xml");
  assert.ok((await sitemap.text()).includes(base + "/methodology"));
  const robots = await context.request.get(base + "/robots.txt");
  assert.ok((await robots.text()).includes(base + "/sitemap.xml"));
  checks.push("sitemap and robots use www");
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByText(/Preparing for launch/).waitFor();
  await page.screenshot({
    path: directory + "/mobile-home.png",
    fullPage: true,
  });
  await page.goto(base + "/review", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .first()
    .click();
  await page.getByLabel("Email address", { exact: true }).fill(account.email);
  await page.getByLabel(/^Password/).fill(account.password);
  const loginResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/account") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  assert.equal((await loginResponse).status(), 200);
  const file = page.getByLabel("Choose a PDF report");
  await file.waitFor();
  assert.equal(await file.isDisabled(), true);
  const identity = await (
    await context.request.get(base + "/api/account")
  ).json();
  assert.equal(identity.user.email, account.email);
  assert.equal(identity.user.founder, false);
  assert.equal((await context.request.get(base + "/api/admin")).status(), 403);
  checks.push("real mobile login, server identity and founder denial");
  const intake = await context.request.post(base + "/api/reviews", {
    headers: { origin: base },
    multipart: {
      file: {
        name: "paused-test.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.7\n%%EOF"),
      },
      consent: "true",
    },
  });
  assert.equal(intake.status(), 503);
  assert.equal((await intake.json()).code, "REVIEWS_PAUSED");
  checks.push("paused intake enforced by both UI and API");
  const saved = await (await context.request.get(base + "/api/reviews")).json();
  assert.deepEqual(saved.reviews, []);
  await page.goto(base + "/reviews", { waitUntil: "networkidle" });
  await page.screenshot({
    path: directory + "/saved-reviews-mobile.png",
    fullPage: true,
  });
  await page.goto(base + "/services/expert-review", {
    waitUntil: "networkidle",
  });
  await page
    .getByLabel("How can we help?")
    .fill(
      "TEST ONLY: production deployment verification. No contact or follow-up requested. This test enquiry will be removed after checking persistence.",
    );
  await page
    .getByRole("checkbox", { name: /may respond to this enquiry/ })
    .check();
  const enquiryResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/enquiries") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  const enquiry = await enquiryResponse;
  assert.equal(enquiry.status(), 201);
  const { id } = await enquiry.json();
  await page.getByRole("heading", { name: "Your enquiry is saved." }).waitFor();
  await page.screenshot({
    path: directory + "/enquiry-confirmed-mobile.png",
    fullPage: true,
  });
  await writeFile(
    directory + "/test-record.json",
    JSON.stringify({ enquiryId: id, ownerId: identity.user.id }),
    { mode: 0o600 },
  );
  checks.push("real enquiry created through production UI");
  assert.deepEqual(errors, []);
  await writeFile(directory + "/checks.json", JSON.stringify(checks, null, 2));
  console.log(JSON.stringify({ checks, browserErrors: 0 }, null, 2));
} finally {
  await browser.close();
}
