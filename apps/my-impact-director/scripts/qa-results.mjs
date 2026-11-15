// Component contract checks only. Requests are intercepted inside this test
// browser; no fixture data is stored in the deployed application.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const review = JSON.parse(
  await readFile("artifacts/synthetic-review.json", "utf8"),
);
const pdf = await readFile("artifacts/synthetic-test-export.pdf");
const browser = await chromium.launch({
  executablePath: process.env.QA_BROWSER || undefined,
  args: ["--no-sandbox"],
  ...(!config.url.includes("localhost") && process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const results = [];
await mkdir("artifacts/browser", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    const share = new URL(config.url);
    if (config.bypass) share.searchParams.set("_vercel_share", config.bypass);
    await page.goto(share.href, { waitUntil: "networkidle" });
    let enquiry;
    await context.route(`${config.url}/api/**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/save")
        return route.fulfill({ json: { emailEnabled: false } });
      if (path === "/api/visitor")
        return route.fulfill({
          json: { user: { id: "synthetic-ui-test", anonymous: true } },
        });
      if (path === "/api/account")
        return route.fulfill({
          json: {
            user: {
              id: "synthetic-ui-test",
              name: "Synthetic QA",
              email: "qa@example.invalid",
              founder: false,
              anonymous: true,
            },
          },
        });
      if (path.endsWith("/export"))
        return route.fulfill({
          body: pdf,
          contentType: "application/pdf",
          headers: {
            "content-disposition":
              'attachment; filename="synthetic-review.pdf"',
          },
        });
      if (path === `/api/reviews/${review.id}`)
        return route.fulfill({ json: review });
      if (path === "/api/reviews")
        return route.fulfill({
          json: {
            reviews: [{ ...review, scores: review.result.scores }],
            enabled: false,
          },
        });
      if (path === "/api/enquiries") {
        enquiry = route.request().postDataJSON();
        return route.fulfill({ status: 201, json: { ok: true } });
      }
      return route.abort();
    });
    await page.goto(`${config.url}/reviews/${review.id}`, {
      waitUntil: "networkidle",
    });
    await page.locator(".score-card").first().waitFor();
    assert.equal(await page.locator(".score-card").count(), 2);
    assert.equal(await page.locator(".principle .finding").count(), 40);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "results fit the viewport",
    );
    await page.screenshot({
      path: `artifacts/browser/${width}-synthetic-results.png`,
      fullPage: true,
    });
    const a11y = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    results.push({
      width,
      mode: "synthetic UI contract",
      violations: a11y.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    });
    await page.locator(".principle .finding summary").first().click();
    await page.locator(".principle .citation a").first().click();
    await page.locator(".source-text").waitFor();
    assert.match(
      await page.locator(".source-text").textContent(),
      /2,000 people/,
    );
    await page
      .getByRole("link", { name: "Back to review", exact: false })
      .click();
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Download your assessment PDF", exact: false })
      .click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "synthetic-review.pdf");
    await page
      .getByRole("link", { name: "Discuss my review", exact: false })
      .click();
    await page.getByLabel("Your name", { exact: true }).fill("Synthetic QA");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("qa@example.invalid");
    await page
      .getByLabel("How can we help?")
      .fill("Synthetic UI contract test. No enquiry is sent or stored.");
    await page.getByRole("checkbox", { name: /Share the linked/ }).check();
    await page
      .getByRole("checkbox", { name: /may respond to this enquiry/ })
      .check();
    await page.getByRole("button", { name: "Send my enquiry" }).click();
    await page
      .getByRole("heading", { name: "Your enquiry is saved." })
      .waitFor();
    assert.equal(enquiry.reviewId, review.id);
    assert.equal(enquiry.shareReview, true);
    assert.equal(enquiry.contactConsent, true);
    await page.goto(`${config.url}/reviews`, { waitUntil: "networkidle" });
    await page
      .getByRole("link", { name: /Synthetic 2025 impact report/ })
      .waitFor();
    await context.close();
  }
} finally {
  await writeFile(
    "artifacts/browser/results-contract.json",
    JSON.stringify(results, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
assert.equal(results.flatMap((r) => r.violations).length, 0);
