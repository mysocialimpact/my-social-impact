import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:3008";
await fs.mkdir("artifacts/dashboard", { recursive: true });
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const checks = [];
try {
  for (const width of [1440, 1366, 390])
    for (const verified of [false, true]) {
      const c = await b.newContext({ viewport: { width, height: 844 } }),
        p = await c.newPage(),
        user = {
          id: "synthetic",
          email: verified ? "qa@example.invalid" : "",
          emailVerified: verified,
          passwordAccount: verified,
          anonymous: !verified,
        };
      const id = "12345678-1234-4234-8234-123456789012";
      let attempts = 0,
        payload;
      const w = {
        id: "source",
        root_id: id,
        title: "Community impact report",
        organisation: "Example organisation",
        reporting_period: "2025",
        created_at: "2026-11-01",
        expires_at: "2027-05-01",
        can_delete: true,
        full: verified,
        assessments: [
          {
            id,
            framework: "claims",
            status: "complete",
            has_result: true,
            score: 75,
            delivery: "accepted",
          },
          {
            id: "22345678-1234-4234-8234-123456789012",
            framework: "report",
            status: "queued",
            has_result: false,
            score: null,
            delivery: null,
          },
        ],
      };
      await c.route("**/api/account", (x) => x.fulfill({ json: { user } }));
      await c.route("**/api/reviews", (x) =>
        x.fulfill({ json: { reviews: [], workspaces: [w] } }),
      );
      await c.route("**/api/workspace", (x) =>
        x.fulfill({ json: { ok: true } }),
      );
      await c.route("**/api/visitor", (x) => x.fulfill({ json: { user } }));
      await c.route("**/api/save", (x) => {
        if (x.request().method() === "GET")
          return x.fulfill({ json: { emailEnabled: true } });
        attempts++;
        payload = x.request().postDataJSON();
        return x.fulfill({
          status: attempts === 1 ? 503 : 200,
          json:
            attempts === 1
              ? { error: "Email could not be sent. Please retry." }
              : { ok: true },
        });
      });
      await p.goto(base + "/reviews", { waitUntil: "networkidle" });
      await p.locator(".personal-report").waitFor();
      assert.equal(await p.locator(".personal-report").count(), 1);
      assert.equal(await p.locator(".personal-assessments section").count(), 3);
      assert.equal(
        await p
          .getByRole("link", { name: "View results →", exact: true })
          .count(),
        1,
      );
      assert.equal(
        await p
          .getByRole("link", { name: "View progress →", exact: true })
          .count(),
        1,
      );
      assert.equal(
        await p
          .getByRole("button", { name: "Start review →", exact: true })
          .count(),
        1,
      );
      assert.equal(
        await p
          .getByRole("link", { name: "Download PDF", exact: true })
          .count(),
        verified ? 1 : 0,
      );
      assert.equal(await p.locator("input[type=password]").count(), 0);
      assert.equal(await p.locator("input[type=email]").count(), 0);
      assert.equal(await p.locator(".permanent-actions").count(), 0);
      if (!verified)
        assert.equal(
          await p
            .locator(".workspace-return")
            .getByRole("link", { name: "Log in", exact: true })
            .count(),
          1,
        );
      const axe = await new AxeBuilder({ page: p }).analyze();
      assert.deepEqual(
        axe.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        [],
      );
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await p.screenshot({
        path: `artifacts/dashboard/saved-${width}-${verified ? "verified" : "guest"}.png`,
        fullPage: true,
      });
      checks.push({
        width,
        verified,
        grouped: true,
        accurateStates: true,
        noPasswordsInReportList: true,
        noRepeatedEmail: verified,
        conventionalLoginEntry: !verified,
        axe: 0,
      });
      await c.close();
    }
  console.log(checks);
} finally {
  await b.close();
}
