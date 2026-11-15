import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const { id } = JSON.parse(
  await readFile("/workspace/mid-anonymous-review.json", "utf8"),
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const observations = [];
try {
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({
        storageState: "/workspace/mid-anonymous-state.json",
        viewport: { width, height: 1000 },
      }),
      page = await ctx.newPage();
    await page.goto(config.url + "/reviews/" + id, {
      waitUntil: "networkidle",
    });
    await page.locator(".score-card").first().waitFor();
    assert.equal(await page.locator(".score-card").count(), 2);
    assert.equal(await page.locator(".principle .finding").count(), 40);
    assert.equal(await page.locator('input[type="password"]').count(), 0);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: `artifacts/live/${width}-real-results.png`,
      fullPage: true,
    });
    const a11y = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    observations.push({
      width,
      violations: a11y.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    });
    await page.locator(".principle .finding summary").first().click();
    await page.locator(".principle .citation a").first().click();
    await page.locator(".source-text").waitFor();
    assert.ok((await page.locator(".source-text").innerText()).length > 100);
    await page
      .getByRole("link", { name: "Back to review", exact: false })
      .click();
    if (width === 1440) {
      const exportResponse = await ctx.request.get(
        config.url + "/api/reviews/" + id + "/export",
      );
      assert.equal(exportResponse.status(), 200);
      const pdf = await exportResponse.body();
      assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
      await writeFile("artifacts/live/genuine-review-export.pdf", pdf);
    }
    await page.goto(config.url + "/reviews", { waitUntil: "networkidle" });
    await page.locator(`a[href="/reviews/${id}"]`).waitFor();
    assert.equal(
      (await (await ctx.request.get(config.url + "/api/account")).json()).user
        .anonymous,
      true,
    );
    await ctx.close();
  }
} finally {
  await writeFile(
    "artifacts/live/real-results-browser.json",
    JSON.stringify(observations, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(observations));
assert.equal(observations.flatMap((x) => x.violations).length, 0);
