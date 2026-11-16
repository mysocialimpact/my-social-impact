// UI contracts use synthetic account/mail transports. Database ownership is tested separately.
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const supplied = process.argv[2],
  base = supplied || "http://localhost:3012";
const server = supplied
  ? null
  : spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3012",
      ],
      {
        stdio: "ignore",
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      },
    );
let browser;
const checks = [];
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base + "/login")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
    if (i === 59) throw Error("Preview server did not start");
  }
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
    ...(supplied ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
  });
  await fs.mkdir("artifacts/accounts", { recursive: true });
  const fixture = JSON.parse(
    await fs.readFile("artifacts/claims-review.json", "utf8"),
  );
  const id = fixture.id;
  for (const [width, height] of [
    [1440, 900],
    [1366, 768],
    [390, 844],
  ]) {
    for (const scenario of [
      "register",
      "login",
      "reports-guest",
      "reports-verified",
      "verify",
      "results",
    ]) {
      const context = await browser.newContext({ viewport: { width, height } }),
        p = await context.newPage();
      let state = ["reports-verified", "results"].includes(scenario)
        ? {
            id: "qa",
            email: "qa@example.invalid",
            anonymous: false,
            emailVerified: true,
            passwordAccount: true,
          }
        : scenario === "verify"
          ? {
              id: "qa",
              email: "qa@example.invalid",
              anonymous: false,
              emailVerified: false,
              passwordAccount: true,
            }
          : scenario === "reports-guest"
            ? { id: "guest", anonymous: true, email: "" }
            : null;
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await context.route("**/api/account", (route) =>
        route.fulfill({
          json:
            route.request().method() === "GET"
              ? { user: state }
              : { ok: true, verified: false, verificationSent: true },
        }),
      );
      const workspace = {
        id: "document",
        root_id: id,
        title: "Community impact report",
        organisation: "Example organisation",
        created_at: "2026-11-01",
        expires_at: "2027-05-01",
        can_delete: true,
        full: !!state?.emailVerified,
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
            id: "12345678-1234-4234-8234-123456789012",
            framework: "report",
            status: "queued",
            has_result: false,
            score: null,
            delivery: null,
          },
        ],
      };
      await context.route("**/api/reviews", (r) =>
        r.fulfill({
          json: { workspaces: scenario === "reports-guest" ? [] : [workspace] },
        }),
      );
      await context.route("**/api/workspace*", (r) =>
        r.fulfill({ json: { workspace } }),
      );
      await context.route("**/api/save", (r) =>
        r.fulfill({ json: { emailEnabled: true, ok: true } }),
      );
      await context.route(`**/api/reviews/${id}`, (r) =>
        r.fulfill({
          json: {
            ...fixture,
            framework: "claims",
            full: true,
            emailEnabled: true,
            understanding_ready: true,
            siblings: [
              { id, framework: "claims", status: "complete", has_result: true },
            ],
          },
        }),
      );
      await p.goto(
        base +
          (scenario === "register"
            ? "/register"
            : scenario === "login"
              ? "/login"
              : scenario === "verify"
                ? "/verify-email"
                : scenario === "results"
                  ? `/reviews/${id}?results=1`
                  : "/reviews"),
        { waitUntil: "networkidle" },
      );
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${scenario} ${width} overflow`,
      );
      if (scenario === "register") {
        assert.equal(
          await p.locator("input[name=marketing]").isChecked(),
          false,
        );
        assert.equal(await p.locator("input[name=name]").count(), 0);
        await p
          .getByLabel("Email address", { exact: true })
          .fill("qa@example.invalid");
        await p
          .locator("input[name=password]")
          .fill("synthetic-ui-test-password");
        await p
          .getByRole("button", { name: "Show password", exact: true })
          .click();
        assert.equal(
          await p.locator("input[name=password]").getAttribute("type"),
          "text",
        );
        await p
          .getByRole("button", { name: "Hide password", exact: true })
          .click();
        await p.screenshot({
          path: `artifacts/accounts/${scenario}-${width}.png`,
          fullPage: true,
        });
      } else
        await p.screenshot({
          path: `artifacts/accounts/${scenario}-${width}.png`,
          fullPage: true,
        });
      if (scenario === "reports-verified") {
        assert.equal(
          await p
            .locator(".header-account-actions")
            .getByRole("link", { name: "Log in", exact: true })
            .count(),
          0,
        );
        assert.equal(
          await p.getByText("Not started", { exact: true }).count(),
          1,
        );
        assert.equal(
          await p.getByText("Preparing", { exact: true }).count(),
          1,
        );
        assert.equal(
          await p.getByText("Completed · 75/100", { exact: true }).count(),
          1,
        );
      }
      const axe = await new AxeBuilder({ page: p })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      checks.push({
        scenario,
        width,
        height,
        errors,
        violations: axe.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
      assert.equal(errors.length, 0, JSON.stringify(errors));
      assert.equal(axe.violations.length, 0, JSON.stringify(checks.at(-1)));
      await context.close();
    }
  }
  await fs.writeFile(
    "artifacts/accounts/verification.json",
    JSON.stringify(checks, null, 2),
  );
  console.log(
    `Passed ${checks.length} account/workspace viewport checks with no axe violations or overflow.`,
  );
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
}
