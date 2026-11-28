import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
const browser = await chromium.launch({
  executablePath: process.env.QA_BROWSER,
  args: ["--no-sandbox"],
});
const base = process.env.QA_BASE_URL || "http://localhost:3000",
  dir = process.env.QA_SCREENSHOTS || "artifacts/feedback/";
await mkdir(dir, { recursive: true });
try {
  for (const width of [1440, 768, 390]) {
    const ctx = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1050 },
      deviceScaleFactor: 1,
    });
    const p = await ctx.newPage();
    await p.goto(base + "/feedback");
    await p.evaluate(() => document.fonts.ready);
    await p.locator(".signature-footer").scrollIntoViewIfNeeded();
    await p.waitForFunction(() =>
      Array.from(document.querySelectorAll(".signature-art img")).every(
        (i) => i.complete && i.naturalWidth,
      ),
    );
    await p
      .locator(".signature-footer")
      .screenshot({
        path: dir + "footer-" + width + ".png",
        style:
          "header.site-header, .campaign-header, .action-bar {visibility:hidden !important}",
      });
    await p
      .locator(".listening")
      .screenshot({
        path: dir + "feedback-" + width + ".png",
        style:
          "header.site-header, .campaign-header, .action-bar {visibility:hidden !important}",
      });
    assert.equal(await p.locator("#public-feedback").count(), 1);
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    const axe = await new AxeBuilder({ page: p })
      .include(".listening")
      .include(".signature-footer")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      axe.violations.map((v) => v.id),
      [],
      width + "px feedback accessibility",
    );
    for (let n = 1; n < 6; n++)
      await p
        .getByRole("radio", {
          name: n + " " + (n === 1 ? "star" : "stars"),
          exact: true,
        })
        .check();
    await p.getByRole("button", { name: "Clear", exact: true }).click();
    await p.getByLabel("Your thoughts").fill("A browser retry fixture");
    await p.getByLabel("Email for a reply").fill("test@example.org");
    assert.equal(await p.getByRole("checkbox").isChecked(), false);
    await p.getByRole("checkbox").check();
    await p.route("**/api/visitor", (r) => r.fulfill({ json: { ok: true } }));
    let prior;
    await p.route("**/api/feedback", (r) => {
      let d = r.request().postDataJSON();
      if (!prior) {
        prior = d;
        return r.fulfill({ status: 503, json: { error: "Temporary outage" } });
      }
      assert.deepEqual(d, prior);
      return r.fulfill({ json: { saved: true, id: d.requestId } });
    });
    await p.getByRole("button", { name: "Send feedback" }).click();
    await p
      .getByRole("alert")
      .filter({ hasText: "Temporary outage" })
      .waitFor();
    assert.equal(
      await p.getByLabel("Your thoughts").inputValue(),
      "A browser retry fixture",
    );
    await p.getByRole("button", { name: "Send feedback" }).click();
    await p.getByRole("heading", { name: /Thank you for/ }).waitFor();
    for (const path of [
      "/",
      "/review",
      "/services",
      "/methodology",
      "/login",
      "/admin",
    ]) {
      await p.goto(base + path);
      assert.equal(
        await p.locator("#public-feedback").count(),
        path === "/admin" ? 0 : 1,
      );
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
