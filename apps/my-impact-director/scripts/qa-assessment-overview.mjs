import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import {
  reportWeights,
  reportV2Criteria,
  REPORT_VERSION,
  reportPillars,
} from "../src/lib/report-methodology.ts";
const base = process.argv[2] || "http://localhost:3074",
  dir = "artifacts/assessment-quality/overview";
await fs.mkdir(dir, { recursive: true });
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const fixture = JSON.parse(
  await fs.readFile("artifacts/report-review.json", "utf8"),
);
const r = fixture.result;
r.version = REPORT_VERSION;
r.beta = true;
r.context.title = "Synthetic overview fixture";
r.editorial = {
  verdict:
    "Clear outcomes and useful examples give readers a sound starting point. The opening needs sharper priorities, and charts need clearer labels to make the most important findings easier to understand.",
  attention: "A synthetic interface fixture, not a professional assessment.",
  scoreConsistency: "consistent",
  scoreExplanation: "Synthetic contract only.",
  readerTest: {},
};
r.actions = {
  summary: r.editorial.verdict,
  strengths: ["Clear outcomes and useful examples."],
  opportunities: ["Give the opening a stronger hierarchy."],
  actions: [
    {
      priority: "quick",
      title: "Lead with your three main findings",
      detail: "Move a short findings summary to the opening.",
      criterionIds: ["report.2.1"],
    },
    {
      priority: "important",
      title: "Give charts useful labels and context",
      detail: "Add direct labels and clear bases to the figures.",
      criterionIds: ["report.5.2"],
    },
    {
      priority: "important",
      title: "Edit the longest passages",
      detail: "Reduce repetition and give readers shorter paragraphs.",
      criterionIds: ["report.1.2"],
    },
  ],
};
r.scores.report = {
  overall: 75,
  coverage: 25,
  provisional: false,
  principles: reportPillars.map((name, i) => ({
    name,
    maximum: reportWeights[i],
    score: reportWeights[i] * 0.75,
    coverage: 5,
    tests: reportV2Criteria.slice(i * 5, i * 5 + 5).map((c) => ({
      id: c.id,
      status: "assessed",
      score: 3,
      explanation: "Synthetic source evidence for interface verification.",
      evidence: [],
      visualPages: [1],
      limitations: [],
      anchorReason: "Synthetic contract, not a real assessment.",
      barrier: "none",
      improvement: "Improve the hierarchy.",
      confidence: "medium",
      claimIds: [],
    })),
  })),
};
r.rating = {
  label: "Strong professional communication",
  reasons: [],
  rule: "Synthetic interface fixture.",
  readerTestPassed: true,
};
Object.assign(fixture, {
  version: REPORT_VERSION + "-report",
  framework: "report",
  status: "complete",
  full: true,
  emailEnabled: true,
  understanding_ready: true,
});
try {
  for (const [w, h] of [
    [1366, 768],
    [1440, 900],
    [1920, 1080],
    [390, 844],
    [320, 640],
  ]) {
    const c = await b.newContext({ viewport: { width: w, height: h } }),
      p = await c.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await c.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        json:
          path === "/api/account"
            ? {
                user: {
                  id: "qa-overview",
                  name: "QA visitor",
                  email: "qa@example.invalid",
                  anonymous: false,
                  emailVerified: true,
                },
              }
            : path === "/api/workspace"
              ? {
                  workspace: {
                    id: fixture.id,
                    root_id: fixture.id,
                    title: "Synthetic report.pdf",
                    organisation: "QA organisation",
                    assessments: [
                      {
                        id: fixture.id,
                        framework: "report",
                        status: "complete",
                        has_result: true,
                      },
                    ],
                  },
                }
              : path === "/api/save"
                ? { emailEnabled: true }
                : fixture,
      });
    });
    await p.goto(`${base}/reviews/${fixture.id}?results=1`, {
      waitUntil: "networkidle",
    });
    await p.locator(".impact-verdict").waitFor();
    await p.evaluate(() => document.fonts.ready);
    assert.equal(await p.locator(".impact-pillar-grid>div").count(), 5);
    assert.equal(await p.locator(".impact-priorities li").count(), 3);
    assert.equal(await p.locator("input[type=email]").count(), 0);
    const geo = await p.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: innerHeight,
      priorities: document
        .querySelector(".impact-priorities")
        .getBoundingClientRect().bottom,
    }));
    assert.ok(geo.width <= w);
    if (w >= 1366)
      assert.ok(geo.priorities <= h - 10, "priorities fit the first screen");
    await p.screenshot({ path: `${dir}/${w}-overview.png`, fullPage: false });
    if (w === 1366) {
      const a = await new AxeBuilder({ page: p })
        .include(".impact-verdict")
        .analyze();
      assert.deepEqual(
        a.violations.map((v) => v.id),
        [],
      );
      console.log({ width: w, prioritiesBottom: geo.priorities, viewport: h });
    }
    await p.locator(".impact-priorities summary").first().click();
    await p
      .locator(".impact-priorities")
      .getByText("Move a short findings summary to the opening.", {
        exact: true,
      })
      .waitFor();
    assert.deepEqual(errors, []);
    await c.close();
  }
  console.log(
    "Five responsive overview sizes, disclosures, account email reuse and accessibility passed.",
  );
} finally {
  await b.close();
}
