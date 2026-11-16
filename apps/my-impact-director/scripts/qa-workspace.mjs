// UI contracts use synthetic transports. Actual account ownership is checked in the database suite.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:3008";
await fs.mkdir("artifacts/dashboard", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(!base.includes("localhost")
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const checks = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1366, 768],
    [1280, 720],
    [390, 844],
    [640, 400],
  ]) {
    for (const framework of ["claims", "excellence", "report"]) {
      const r = JSON.parse(
        await fs.readFile(`artifacts/${framework}-review.json`),
      );
      r.full = false;
      r.emailEnabled = true;
      r.understanding_ready = true;
      r.siblings = [
        { id: r.id, framework, status: "complete", has_result: true },
      ];
      const w = {
        id: "source",
        root_id: r.id,
        title: r.title,
        organisation: r.organisation,
        reporting_period: "2025",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        can_delete: true,
        full: false,
        assessments: [
          {
            id: r.id,
            framework,
            status: "complete",
            has_result: true,
            viewed: false,
            score: 75,
            delivery: null,
          },
        ],
      };
      const c = await browser.newContext({
          viewport: { width, height },
          reducedMotion: width === 640 ? "reduce" : "no-preference",
        }),
        p = await c.newPage();
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await c.route("**/api/account", (x) =>
        x.fulfill({ json: { user: { id: "guest", anonymous: true } } }),
      );
      await c.route("**/api/workspace?*", (x) =>
        x.fulfill({ json: { workspace: w } }),
      );
      await c.route("**/api/save", (x) =>
        x.fulfill({
          json:
            x.request().method() === "GET"
              ? { emailEnabled: true }
              : { ok: true },
        }),
      );
      await c.route("**/api/reviews/*", (x) =>
        x.fulfill({ json: x.request().method() === "POST" ? { ok: true } : r }),
      );
      await p.goto(base + "/reviews/" + r.id, { waitUntil: "networkidle" });
      await p.locator(".methodology-lesson").waitFor();
      await p.locator(".workspace-tracker").waitFor();
      assert.equal(await p.locator(".workspace-assessment").count(), 3);
      assert.equal(
        await p
          .locator(".workspace-assessment strong")
          .filter({ hasText: "Not started" })
          .count(),
        2,
      );
      assert.equal(
        await p
          .locator(".workspace-assessment strong")
          .filter({ hasText: "Completed" })
          .count(),
        1,
      );
      for (let step = 0; step < 7; step++) {
        await p.waitForTimeout(260);
        const g = await p.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          viewport: innerHeight,
          tracker: document
            .querySelector(".workspace-tracker")
            .getBoundingClientRect(),
          controls: document
            .querySelector(".lesson-controls")
            .getBoundingClientRect(),
          bar: document
            .querySelector(".permanent-actions")
            .getBoundingClientRect(),
        }));
        assert.ok(g.width <= width + 1, JSON.stringify(g));
        assert.ok(g.height <= height + 2, JSON.stringify(g));
        assert.ok(g.controls.bottom <= g.bar.top + 1);
        await p.screenshot({
          path: `artifacts/dashboard/${width}-${framework}-${step}.png`,
        });
        if (step < 6)
          await p.getByRole("button", { name: "Next →", exact: true }).click();
      }
      await p
        .getByRole("button", { name: /See my results/ })
        .first()
        .click();
      await p.locator(".snapshot-heading").waitFor();
      assert.equal(
        await p
          .locator(".action-primary")
          .innerText()
          .then((t) => t.trim().replace(/\s+/g, " ")),
        "Explore your next review",
      );
      const axe = await new AxeBuilder({ page: p }).analyze();
      assert.deepEqual(
        axe.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        [],
      );
      assert.deepEqual(errors, []);
      checks.push({
        width,
        height,
        framework,
        steps: 7,
        accurateStatuses: true,
        geometry: true,
        axe: 0,
      });
      await c.close();
    }
  }
  // Queued and malformed-complete reviews must never be offered as results.
  for (const status of ["queued", "running", "failed", "complete"]) {
    const r = JSON.parse(await fs.readFile("artifacts/document-review.json"));
    r.emailEnabled = true;
    r.siblings = [
      {
        id: "bbbbaaaa-1111-4444-8888-111111111111",
        framework: "claims",
        status,
        has_result: false,
      },
    ];
    const c = await browser.newContext({
        viewport: { width: 1366, height: 768 },
      }),
      p = await c.newPage();
    await c.route("**/api/account", (x) =>
      x.fulfill({ json: { user: { id: "guest", anonymous: true } } }),
    );
    await c.route("**/api/workspace?*", (x) =>
      x.fulfill({
        json: {
          workspace: {
            root_id: r.id,
            title: r.title,
            organisation: r.organisation,
            assessments: r.siblings,
          },
        },
      }),
    );
    await c.route("**/api/save", (x) =>
      x.fulfill({ json: { emailEnabled: true } }),
    );
    await c.route("**/api/reviews/*", (x) => x.fulfill({ json: r }));
    await p.goto(base + "/reviews/" + r.id, { waitUntil: "networkidle" });
    assert.equal(
      await p
        .locator(".review-choices")
        .getByRole("button", { name: /results/ })
        .count(),
      0,
    );
    assert.equal(
      await p
        .locator(".workspace-tracker")
        .getByRole("link", { name: /View results/ })
        .count(),
      0,
    );
    assert.equal(await p.locator("input[type=password]").count(), 0);
    assert.equal(
      await p
        .getByRole("heading", { name: "Make this your Impact Director." })
        .count(),
      1,
    );
    checks.push({
      status,
      noInventedResults: true,
      earlyPasswordlessInvite: true,
    });
    await c.close();
  }
  await fs.writeFile(
    "artifacts/dashboard/contracts.json",
    JSON.stringify(checks, null, 2),
  );
  console.log(checks);
} finally {
  await browser.close();
}
