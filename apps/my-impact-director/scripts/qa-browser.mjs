import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Optional private configuration lives outside source control. Never log bypass tokens.
const config = process.argv[2]
  ? JSON.parse(await readFile(process.argv[2], "utf8"))
  : {};
const base = config.url || process.env.QA_BASE_URL;
if (!base) throw new Error("Set QA_BASE_URL to the deployment to verify.");
const bypass = config.bypass || process.env.QA_BYPASS;
const directory = "artifacts/browser";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.QA_BROWSER || undefined,
  args: ["--no-sandbox"],
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const observations = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1000 },
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (bypass) {
      const share = new URL(base);
      share.searchParams.set("_vercel_share", bypass);
      await page.goto(share.href, { waitUntil: "networkidle" });
    }
    for (const path of [
      "/",
      "/review",
      "/reviews",
      "/methodology",
      "/services",
      "/services/expert-review",
      "/privacy",
      "/terms",
      "/admin",
    ]) {
      const response = await page.goto(new URL(path, base).href, {
        waitUntil: "networkidle",
      });
      assert.equal(response.status(), 200, `${path} loads at ${width}px`);
      assert.match(await page.title(), /My Impact Director/);
      assert.equal(await page.locator("h1").count(), 1);
      if (path === "/")
        await page.screenshot({
          path: `${directory}/${width}-home.png`,
          fullPage: true,
        });
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return r.right > window.innerWidth + 1 || r.left < -1;
          })
          .map((e) => ({
            tag: e.tagName,
            class: e.className,
            text: e.textContent?.slice(0, 70),
            right: e.getBoundingClientRect().right,
          })),
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `${path} overflows at ${width}px: ${JSON.stringify(overflow.slice(0, 12))}`,
      );
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      observations.push({
        path,
        width,
        violations: accessibility.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
      if (path === "/" || path === "/review")
        await page.screenshot({
          path: `${directory}/${width}-${path === "/" ? "home" : "review"}.png`,
          fullPage: true,
        });
      if (path === "/review") {
        await page
          .getByRole("button", { name: "Sign in", exact: true })
          .first()
          .click();
        await page.getByRole("heading", { name: "Welcome back." }).waitFor();
        assert.equal(
          await page.getByLabel("Your name", { exact: true }).count(),
          0,
        );
        await page
          .getByRole("button", { name: "Create account", exact: true })
          .click();
        await page
          .getByLabel("Your name", { exact: true })
          .fill("Synthetic Browser QA");
        await page
          .getByLabel("Email address", { exact: true })
          .fill("qa@example.invalid");
        await page.getByLabel(/^Password/).fill("short");
        assert.equal(
          await page.locator("form").evaluate((form) => form.checkValidity()),
          false,
          "short registration password is rejected before submission",
        );
      }
    }
    assert.deepEqual(errors, [], `no uncaught browser errors at ${width}px`);
    await context.close();
  }
} finally {
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(observations, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(observations, null, 2));
assert.equal(
  observations.flatMap((o) => o.violations).length,
  0,
  "Resolve accessibility violations before release.",
);
