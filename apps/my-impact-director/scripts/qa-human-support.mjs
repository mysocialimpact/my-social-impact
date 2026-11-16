// Browser contracts use synthetic transport; database tests verify actual persistence/access.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.argv[2] || "http://localhost:3006";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(!base.includes("localhost") && process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const results = [];
await fs.mkdir("artifacts/human", { recursive: true });
try {
  for (const [width, height] of [
    [1440, 900],
    [1366, 768],
    [1280, 720],
    [390, 844],
    [320, 700],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await context.route("**/api/account", (r) =>
      r.fulfill({ json: { user: null } }),
    );
    await context.route("**/api/visitor", (r) =>
      r.fulfill({ json: { ok: true } }),
    );
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      for (const i of document.images) {
        i.loading = "eager";
        await i.decode().catch(() => {});
      }
    });
    assert.equal(await page.locator(".support-preview li").count(), 5);
    assert.equal(
      await page.locator(".human-contact h3").innerText(),
      "Marcus Warry ACA",
    );
    assert.ok(
      await page
        .locator(".marcus-portrait img")
        .evaluate((i) => i.complete && i.naturalWidth > 0),
    );
    assert.ok(await page.getByText("Choose a PDF", { exact: true }).count());
    assert.equal(
      await page.locator(".contact-actions a").first().getAttribute("href"),
      "mailto:marcus@mysocialimpact.org?subject=Let%E2%80%99s%20talk%20about%20impact",
    );
    const homeAxe = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      homeAxe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: `artifacts/human/final-home-${width}.png`,
      fullPage: true,
    });
    if (width < 1001) await page.getByRole("button", { name: "Menu" }).click();
    await page
      .locator("#main-nav")
      .getByRole("link", { name: "Your Impact Director", exact: true })
      .click();
    await page.waitForURL("**/your-impact-director");
    await page.waitForLoadState("networkidle");
    assert.equal(await page.locator(".pricing-row").count(), 5);
    assert.match(
      await page.locator(".pricing-terms").innerText(),
      /not final contractual offers/,
    );
    assert.ok(
      await page.getByRole("link", { name: /Try The Ideas Shed/ }).count(),
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    const supportAxe = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      supportAxe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    await page.screenshot({
      path: `artifacts/human/final-support-${width}.png`,
      fullPage: true,
    });
    for (const [id, label] of [
      ["essentials", "Essentials"],
      ["supported", "Supported"],
      ["director", "Director"],
      ["bespoke", "Bespoke"],
    ]) {
      await page
        .getByRole("link", { name: `Explore ${label}`, exact: true })
        .click();
      await page.waitForURL(`**interest=${id}*`);
      assert.equal(await page.getByLabel("I’m interested in").inputValue(), id);
    }
    await page
      .getByRole("link", { name: "Talk to us about AI readiness", exact: true })
      .click();
    await page.waitForURL("**interest=ai-readiness*");
    assert.equal(
      await page.getByLabel("I’m interested in").inputValue(),
      "ai-readiness",
    );
    let attempts = 0,
      payload;
    await context.route("**/api/enquiries", (r) => {
      payload = r.request().postDataJSON();
      attempts++;
      return r.fulfill({
        status: attempts === 1 ? 503 : 201,
        json:
          attempts === 1
            ? { error: "We couldn’t save that. Please try again." }
            : { id: "synthetic" },
      });
    });
    await page
      .getByLabel("Your name", { exact: true })
      .fill("Synthetic Support QA");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("qa@example.invalid");
    await page
      .getByLabel("Organisation (optional)")
      .fill("Synthetic Organisation");
    await page
      .getByLabel("How can we help?")
      .fill("Synthetic enquiry. Please do not contact.");
    await page
      .getByRole("checkbox", { name: /may respond to this enquiry/ })
      .check();
    await page
      .getByRole("button", { name: "Send my enquiry", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: /couldn’t save/ })
      .waitFor();
    assert.equal(
      await page.getByLabel("Your name", { exact: true }).inputValue(),
      "Synthetic Support QA",
    );
    await page
      .getByRole("button", { name: "Send my enquiry", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Your enquiry is saved." })
      .waitFor();
    assert.equal(payload.service, "ai-readiness");
    assert.ok(
      payload.message.startsWith("Organisation: Synthetic Organisation\n\n"),
    );
    assert.equal(payload.shareReview, false);
    assert.equal(payload.reviewId, null);
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      home: true,
      support: true,
      pricing: true,
      selection: true,
      errorRecovery: true,
      axe: 0,
    });
    await context.close();
  }
  // Both completed review paths keep the authorised review association through pricing.
  for (const framework of ["claims", "excellence"]) {
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
      }),
      page = await context.newPage();
    const review = JSON.parse(
      await fs.readFile(`artifacts/${framework}-review.json`, "utf8"),
    );
    review.full = false;
    review.emailEnabled = true;
    review.understanding_ready = true;
    await context.route("**/api/account", (r) =>
      r.fulfill({ json: { user: { id: "synthetic", anonymous: true } } }),
    );
    await context.route("**/api/reviews/*", (r) => r.fulfill({ json: review }));
    await context.route("**/api/save", (r) =>
      r.fulfill({ json: { emailEnabled: true } }),
    );
    await page.goto(`${base}/reviews/${review.id}`, {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("button", { name: /See my results/ })
      .first()
      .click();
    const link = page.getByRole("link", {
      name: "Meet your Impact Director",
      exact: true,
    });
    await link.waitFor();
    await link.click();
    await page.waitForURL(`**/your-impact-director?review=${review.id}`);
    await page
      .getByRole("link", { name: "Explore Director", exact: true })
      .click();
    await page.waitForURL(`**interest=director&review=${review.id}*`);
    assert.equal(
      await page.getByLabel("I’m interested in").inputValue(),
      "director",
    );
    assert.equal(
      await page
        .getByRole("checkbox", { name: /Share the linked/ })
        .isChecked(),
      false,
    );
    let payload;
    await context.route("**/api/visitor", (r) =>
      r.fulfill({ json: { ok: true } }),
    );
    await context.route("**/api/enquiries", (r) => {
      payload = r.request().postDataJSON();
      return r.fulfill({ status: 201, json: { id: "synthetic" } });
    });
    await page.getByLabel("Your name", { exact: true }).fill("Synthetic QA");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("qa@example.invalid");
    await page
      .getByLabel("How can we help?")
      .fill("Synthetic linked review enquiry.");
    await page
      .getByRole("checkbox", { name: /may respond to this enquiry/ })
      .check();
    await page.getByRole("button", { name: "Send my enquiry" }).click();
    await page
      .getByRole("heading", { name: "Your enquiry is saved." })
      .waitFor();
    assert.equal(payload.reviewId, review.id);
    assert.equal(payload.shareReview, false);
    assert.equal(payload.service, "director");
    results.push({ framework, reviewHandoff: true, consentNotAssumed: true });
    await context.close();
  }
  await fs.writeFile(
    "artifacts/human/contracts.json",
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
