import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:3078";
await fs.mkdir("artifacts/dashboard", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const width of [1366, 390, 320])
    for (const verified of [false, true]) {
      const context = await browser.newContext({
          viewport: { width, height: 900 },
        }),
        page = await context.newPage();
      const workspace = {
        id: "7dd03746-878a-4b72-823c-78f3eb1d5a83",
        root_id: "7dd03746-878a-4b72-823c-78f3eb1d5a83",
        title: "Profit Impact 2026 Impact Report",
        organisation: "Profit Impact",
        created_at: "2026-11-17",
        expires_at: "2027-05-16",
        full: verified,
        assessments: [
          {
            id: "claims",
            framework: "claims",
            status: "running",
            has_result: false,
            score: null,
          },
          {
            id: "design",
            framework: "report",
            status: "complete",
            has_result: true,
            score: 51.5,
          },
        ],
      };
      const unexpected = [];
      await context.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/account")
          return route.fulfill({
            json: {
              user: {
                id: "qa",
                email: "qa@example.invalid",
                name: "Marcus",
                emailVerified: verified,
                anonymous: false,
              },
            },
          });
        if (path === "/api/workspace")
          return route.fulfill({ json: { workspace } });
        if (path === "/api/reviews")
          return route.fulfill({ json: { workspaces: [workspace] } });
        if (path === "/api/service-intents")
          return route.fulfill({ json: { ok: true } });
        unexpected.push(path);
        return route.fulfill({
          status: 400,
          json: { error: "Unexpected request" },
        });
      });
      await page.goto(base + "/reviews", { waitUntil: "networkidle" });
      const panels = page.locator(".workspace-review-panel");
      assert.equal(await panels.count(), 3);
      assert.deepEqual(await panels.locator("h3").allTextContents(), [
        "Social Impact Claims Code",
        "Social Impact Excellence",
        "The Impact Design Review",
      ]);
      assert.equal(await page.locator(".is-incomplete").count(), 2);
      assert.match(await panels.nth(2).innerText(), /52\s*\/100\s*Fair/);
      assert.match(await panels.nth(0).innerText(), /Preparing/);
      assert.match(await panels.nth(1).innerText(), /Not started/);
      assert.equal(
        await page
          .getByRole("button", { name: /verification|confirm/i })
          .count(),
        0,
      );
      for (const img of await panels.locator("img").all())
        assert.ok(
          await img.evaluate(async (node) => {
            await node.decode();
            return node.naturalWidth > 0;
          }),
        );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      for (const service of ["discussion", "improvement", "preparation"])
        assert.equal(
          await page
            .locator(
              '.pub-offers a[href="/about?service=' + service + '#contact"]',
            )
            .count(),
          1,
        );
      assert.ok(
        await page
          .locator(".workspace-professional")
          .evaluate(
            (el) =>
              el.compareDocumentPosition(
                document.querySelector(".personal-workspaces"),
              ) & Node.DOCUMENT_POSITION_PRECEDING,
          ),
      );
      assert.deepEqual(unexpected, []);
      if (width === 1366 && verified) {
        const audit = await new AxeBuilder({ page })
          .include(".reports-content")
          .analyze();
        assert.deepEqual(
          audit.violations.map((v) => v.id),
          [],
        );
      }
      await page.screenshot({
        path: "artifacts/dashboard/reports-" + width + "-" + verified + ".png",
        fullPage: true,
      });
      console.log(
        width,
        verified,
        "branded order, scores, incomplete states, no verification gate and service links passed",
      );
      await context.close();
    }
} finally {
  await browser.close();
}
