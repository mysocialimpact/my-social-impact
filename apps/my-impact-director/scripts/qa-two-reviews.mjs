// Explicitly synthetic browser contracts; no report is stored and no email sent.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const base = process.argv[2] || "http://localhost:3004";
await mkdir("artifacts/two-reviews", { recursive: true });
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(!base.includes("localhost") && process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const checks = [];
try {
  for (const width of [1366, 390])
    for (const framework of ["claims", "excellence"]) {
      const r = JSON.parse(
        await readFile(`artifacts/${framework}-review.json`, "utf8"),
      );
      r.full = false;
      r.emailEnabled = true;
      r.understanding_ready = true;
      const c = await b.newContext({ viewport: { width, height: 900 } }),
        p = await c.newPage();
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await c.route("**/api/account", (route) =>
        route.fulfill({
          json: {
            user: {
              id: "synthetic",
              email: "",
              name: "",
              anonymous: true,
              founder: false,
            },
          },
        }),
      );
      await c.route("**/api/save", (route) =>
        route.fulfill({ json: { emailEnabled: true } }),
      );
      await c.route("**/api/reviews/*", (route) =>
        route.fulfill({
          json: route.request().method() === "POST" ? { ok: true } : r,
        }),
      );
      await p.goto(base + "/reviews/" + r.id, { waitUntil: "networkidle" });
      await p.locator(".methodology-lesson").waitFor();
      for (let step = 0; step < 7; step++) {
        await p.waitForTimeout(300);
        await p.screenshot({
          path: `artifacts/two-reviews/${width}-${framework}-${step}.png`,
          fullPage: true,
        });
        assert.ok(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        if (step < 6)
          await p.getByRole("button", { name: "Next →", exact: true }).click();
      }
      await p.locator(".action-primary").click();
      await p.locator(".pub-cover").waitFor();
      assert.equal(await p.locator(".pub-scores h3").count(), 5);
      assert.equal(await p.locator(".finding").count(), 0);
      assert.equal(await p.locator('a[href$="/export"]').count(), 0);
      await p.screenshot({
        path: `artifacts/two-reviews/${width}-${framework}-snapshot.png`,
        fullPage: true,
      });
      const a = await new AxeBuilder({ page: p })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      checks.push({
        width,
        framework,
        violations: a.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        errors,
      });
      r.full = true;
      await p.reload({ waitUntil: "networkidle" });
      await p.locator(".action-primary").click();
      await p.locator(".full-review-details > summary").click();
      assert.equal(await p.locator(".principle .finding").count(), 20);
      assert.equal(await p.locator('a[href$="/export"]').count(), 0);
      await c.close();
    }
} finally {
  await b.close();
  await writeFile(
    "artifacts/two-reviews/browser-contract.json",
    JSON.stringify(checks, null, 2),
  );
}
console.log(JSON.stringify(checks));
assert.equal(checks.flatMap((c) => c.violations).length, 0);
assert.equal(checks.flatMap((c) => c.errors).length, 0);
