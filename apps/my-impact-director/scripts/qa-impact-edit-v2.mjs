// Synthetic UI contracts only. All API calls are intercepted; no model or email transport is used.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:3016",
  old = JSON.parse(
    await fs.readFile("artifacts/impact-edit-v2/original-profit.json", "utf8"),
  ).result,
  ref = JSON.parse(
    await fs.readFile(
      "artifacts/impact-edit-v2/offline-reference.json",
      "utf8",
    ),
  )[0];
const next = {
  ...structuredClone(old),
  version: "2.0.0",
  actions: {
    ...old.actions,
    summary:
      "Offline v2 UI reference, not a model assessment. The report contains candid material, but the opening, visual execution and data displays need substantial improvement.",
    strengths: ["Candid discussion of weaknesses and authentic material."],
    opportunities: [
      "Bring achieved outcomes forward and improve chart and table communication.",
    ],
  },
  scores: { report: ref.next },
  rating: {
    label: "Needs substantial improvement",
    reasons: [
      "A serious readability or accessibility barrier remains unresolved.",
    ],
    readerTestPassed: false,
    rule: "Excellent requires a raw total of at least 80, no weak pillar, no serious barrier and a successful simulated reader test. The numerical total is unchanged.",
  },
  editorial: {
    verdict:
      "The report contains authentic material and candid weaknesses, but its opening and data displays require substantial editorial work.",
    attention:
      "Late, loosely structured human material makes sustained reading harder than it needs to be.",
    scoreConsistency: "consistent",
    scoreExplanation:
      "The low reference total matches the effort needed to locate outcomes and caveats.",
    readerTest: Object.fromEntries(
      ["outcomes", "scale", "limitations", "nextSteps"].map((x, i) => [
        x,
        {
          finding:
            "The reader must assemble relevant information from several sections.",
          page: [3, 6, 16, 21][i],
          access: "effortful",
        },
      ]),
    ),
  },
  pdfChecks: JSON.parse(
    await fs.readFile("artifacts/impact-edit-v2/profit-checks.json", "utf8"),
  ),
};
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const [width, height] of [
    [1366, 768],
    [390, 844],
  ])
    for (const version of ["1.0.0", "2.0.0"]) {
      const c = await b.newContext({ viewport: { width, height } }),
        p = await c.newPage(),
        errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      const id =
          version === "1.0.0"
            ? "8dcde927-1102-4be7-9c60-4fdd80084426"
            : "12121212-1212-4212-8212-121212121212",
        result = version === "1.0.0" ? old : next;
      const siblings = [
        {
          id: "12121212-1212-4212-8212-121212121212",
          version: "2.0.0-report",
          framework: "report",
          status: "complete",
          has_result: true,
        },
        {
          id: "8dcde927-1102-4be7-9c60-4fdd80084426",
          version: "1.0.0-report",
          framework: "report",
          status: "complete",
          has_result: true,
        },
      ];
      const r = {
        id,
        version: version + "-report",
        framework: "report",
        status: "complete",
        stage: 15,
        organisation: "Profit Impact",
        title: "Profit Impact 2026 Impact Report",
        result,
        full: true,
        emailEnabled: false,
        siblings,
        understanding_ready: true,
      };
      await c.route("**/api/**", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/save")
          return route.fulfill({ json: { emailEnabled: false } });
        if (url.pathname === "/api/account")
          return route.fulfill({
            json: {
              user: {
                id: "synthetic",
                email: "qa@example.invalid",
                emailVerified: true,
                passwordAccount: true,
                anonymous: false,
              },
            },
          });
        if (url.pathname.startsWith("/api/workspace"))
          return route.fulfill({
            json: {
              workspace: {
                id: "source",
                root_id: id,
                title: r.title,
                organisation: r.organisation,
                full: true,
                assessments: siblings,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 86400000).toISOString(),
              },
            },
          });
        if (url.pathname === "/api/reviews/" + id)
          return route.fulfill({ json: r });
        throw Error("Unexpected API access " + url.pathname);
      });
      await p.goto(base + "/reviews/" + id + "?results=1", {
        waitUntil: "networkidle",
      });
      await p
        .getByRole("heading", { name: "The headline snapshot", exact: true })
        .waitFor();
      await p.locator(".score-value").first().waitFor();
      assert.match(
        await p.locator(".score-value").first().innerText(),
        version === "1.0.0" ? /^84\b/ : /^39\.63\b/,
      );
      if (version === "2.0.0") {
        assert.ok(
          (await p.locator(".score-card").first().innerText()).includes("/ 25"),
        );
        assert.ok(
          (await p.locator(".score-card").first().innerText()).includes("/ 15"),
        );
        assert.equal(
          await p
            .locator(".score-card")
            .getByText("Engagement", { exact: true })
            .count(),
          0,
        );
        await p
          .getByText("How the rating is decided", { exact: true })
          .first()
          .waitFor();
      } else {
        assert.ok(
          (await p.locator(".score-card").first().innerText()).includes(
            "Engagement",
          ),
        );
        await p
          .getByRole("button", {
            name: "Run The Impact Edit v2 on this report",
            exact: true,
          })
          .waitFor();
      }
      await p
        .locator(".score-card")
        .first()
        .screenshot({
          path: `artifacts/impact-edit-v2/score-${version}-${width}.png`,
        });
      await p.locator(".full-review-details > summary").click();
      if (version === "2.0.0") {
        await p
          .getByRole("heading", {
            name: "Whole-report editorial verdict",
            exact: true,
          })
          .waitFor();
        await p
          .getByText("Accessibility: checked and not checked", { exact: true })
          .waitFor();
      }
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      const axe = await new AxeBuilder({ page: p }).analyze();
      if (axe.violations.length)
        console.log(
          axe.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.html),
          })),
        );
      assert.deepEqual(
        axe.violations.map((x) => x.id),
        [],
      );
      await p.screenshot({
        path: `artifacts/impact-edit-v2/ui-${version}-${width}.png`,
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      console.log({
        version,
        width,
        correctPillars: true,
        historicalScorePreserved: version === "1.0.0",
        weightedLabels: true,
        readerTest: version === "2.0.0",
        axe: 0,
      });
      await c.close();
    }
  const c = await b.newContext(),
    p = await c.newPage();
  for (const [url, heading] of [
    [
      "/methodology/impact-report-excellence",
      "The Impact Edit Methodology v2.0.0",
    ],
    [
      "/methodology/impact-report-excellence/v1",
      "Impact Report Excellence Methodology v1.0",
    ],
  ]) {
    await p.goto(base + url, { waitUntil: "networkidle" });
    await p
      .getByRole("heading", { level: 1, name: heading, exact: true })
      .waitFor();
  }
  console.log({ versionedDocumentation: true });
} finally {
  await b.close();
}
