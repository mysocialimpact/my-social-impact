import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.argv[2] || "http://localhost:3001";
await mkdir("artifacts/radical", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(!base.includes("localhost") && process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const observations = [];
try {
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [390, 844],
    [360, 780],
    [820, 1180],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const i of document.images) i.loading = "eager";
      await Promise.all(
        [...document.images].map((i) => i.decode().catch(() => {})),
      );
    });
    assert.match(await page.locator("h1").innerText(), /MY IMPACT\s+DIRECTOR/);
    assert.equal(await page.locator("main .campaign > section").count(), 4);
    assert.equal(
      await page.locator("input[type=email], input[type=password]").count(),
      0,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    const header = page.locator(".site-header"),
      bar = page.locator(".permanent-actions");
    const barRect = await bar.boundingBox();
    assert.ok(Math.abs(barRect.y + barRect.height - height) < 2);
    const credit = await page.locator(".director-credit").boundingBox();
    assert.ok(
      credit.y + credit.height < barRect.y,
      "Founder attribution is in opening viewport",
    );
    if (width <= 700) {
      const shortcut = page.getByRole("button", {
        name: /First job: review your report/,
      });
      const box = await shortcut.boundingBox();
      assert.ok(box.y + box.height < barRect.y);
      const chooser = page.waitForEvent("filechooser");
      await shortcut.click();
      await chooser;
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      assert.equal(
        await page.locator(".menu-toggle").getAttribute("aria-expanded"),
        "true",
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator(".menu-toggle").getAttribute("aria-expanded"),
        "false",
      );
    } else if (width >= 1000) {
      const box = await page.locator(".choose-file").boundingBox();
      assert.ok(
        box.y + box.height < barRect.y,
        "Upload action visible on laptop",
      );
    }
    await page.locator("input[type=file]").setInputFiles({
      name: "not-a-pdf.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Invalid file"),
    });
    assert.match(
      await page.locator(".alert[role=alert]").innerText(),
      /PDF version/,
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.screenshot({ path: `artifacts/radical/${width}-initial.png` });
    await page.screenshot({
      path: `artifacts/radical/${width}-full.png`,
      fullPage: true,
    });
    await page.evaluate(() =>
      scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    await page.waitForTimeout(400);
    assert.equal(
      Math.round((await header.boundingBox()).y),
      0,
      "Header stays visible",
    );
    const last = await page.locator(".footer-legal").boundingBox();
    const finalBar = await bar.boundingBox();
    assert.ok(
      last.y + last.height <= finalBar.y + 1,
      "Footer clears action bar",
    );
    await page.locator(".action-feedback").click();
    await page.waitForURL(/\/feedback/);
    await page.getByRole("radio", { name: "4", exact: true }).check();
    const comment = page.getByRole("textbox", {
      name: /What would make it better/,
    });
    await comment.fill(
      "Browser contract QA: keep this text after a failed submission.",
    );
    // Transport contract only. Genuine persistence is verified separately against deployed data.
    await page.route("**/api/visitor", (r) =>
      r.fulfill({ status: 200, json: { ok: true } }),
    );
    await page.route("**/api/feedback", (r) =>
      r.fulfill({ status: 503, json: { error: "Temporary test failure" } }),
    );
    await page
      .getByRole("button", { name: "Send feedback", exact: true })
      .click();
    await page.locator(".alert[role=alert]").waitFor();
    assert.match(await comment.inputValue(), /keep this text/);
    await page.route("**/api/feedback", (r) =>
      r.fulfill({ status: 201, json: { id: "browser-contract" } }),
    );
    await page
      .getByRole("button", { name: "Send feedback", exact: true })
      .click();
    await page.getByRole("heading", { name: /Heard/ }).waitFor();
    assert.equal(
      new URL(
        await page
          .getByRole("link", { name: /Back to where/ })
          .getAttribute("href"),
        base,
      ).pathname,
      "/",
    );
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    observations.push({
      width,
      height,
      feedbackViolations: axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      errors,
    });
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(
    "artifacts/radical/interaction-checks.json",
    JSON.stringify(observations, null, 2),
  );
}
console.log(JSON.stringify(observations));
assert.equal(observations.flatMap((o) => o.feedbackViolations).length, 0);
