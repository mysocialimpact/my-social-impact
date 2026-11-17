// Exercises real UI with synthetic account, email and model transports. No external messages or paid runs.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:3037";
await fs.mkdir("artifacts/account-journey", { recursive: true });
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(!base.includes("localhost")
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const checks = [];
try {
  for (const [width, height] of [
    [1519, 915],
    [1366, 768],
    [390, 844],
    [320, 812],
  ]) {
    const c = await b.newContext({ viewport: { width, height } }),
      p = await c.newPage(),
      errors = [],
      writes = [];
    const email = "returning@example.invalid";
    let user = null,
      bytes = 0,
      review = JSON.parse(await fs.readFile("artifacts/document-review.json"));
    const guestReview = () =>
      Object.assign(review, {
        framework: "document",
        status: "ingested",
        result: null,
        full: false,
        emailEnabled: true,
        understanding_ready: true,
        siblings: [],
      });
    guestReview();
    p.on("pageerror", (e) => errors.push(e.message));
    await c.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname,
        method = req.method();
      if (path === "/api/account") {
        if (method === "POST") {
          const d = req.postDataJSON();
          writes.push({ path, ...d, password: "[redacted]" });
          user =
            d.action === "logout"
              ? null
              : {
                  id: "synthetic-owner",
                  name: "QA Visitor",
                  email: d.email,
                  anonymous: false,
                  emailVerified: false,
                  passwordAccount: true,
                };
          return route.fulfill({ json: { ok: true } });
        }
        return route.fulfill({ json: { user } });
      }
      if (path === "/api/service-intents")
        return route.fulfill({ json: { recorded: "intent_only" } });
      if (path === "/api/save") {
        if (method === "POST") writes.push({ path, ...req.postDataJSON() });
        return route.fulfill({
          json:
            method === "GET"
              ? { emailEnabled: true }
              : { ok: true, verified: user?.emailVerified === true },
        });
      }
      if (path === "/api/visitor") return route.fulfill({ json: { ok: true } });
      if (path === "/api/uploads")
        return route.fulfill({
          json: { id: "synthetic-upload", chunkSize: 3000000 },
        });
      if (path === "/api/uploads/synthetic-upload") {
        if (method === "PUT") bytes += req.postDataBuffer().length;
        return route.fulfill({ json: { id: review.id } });
      }
      if (path.startsWith("/api/workspace"))
        return route.fulfill({
          json: {
            workspace: {
              id: review.id,
              root_id: review.id,
              title: review.title,
              assessments: review.siblings,
              full: review.full,
            },
          },
        });
      if (path.startsWith("/api/reviews/")) {
        if (method === "POST") {
          const d = req.postDataJSON();
          writes.push({ path, ...d });
          if (d.framework) {
            Object.assign(review, {
              framework: d.framework,
              status: "queued",
              siblings: [
                {
                  id: review.id,
                  framework: d.framework,
                  status: "queued",
                  has_result: false,
                },
              ],
            });
          }
          return route.fulfill({ json: { id: review.id, ok: true } });
        }
        return route.fulfill({ json: review });
      }
      throw Error("Unexpected API " + path);
    });
    await p.goto(base, { waitUntil: "networkidle" });
    await p
      .getByRole("heading", { name: "Create your free account.", exact: true })
      .waitFor();
    assert.equal(await p.locator("input[type=file]").count(), 0);
    await p.locator(".header-review").click();
    assert.equal(
      await p
        .locator("#upload input[name=email]")
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await p.locator("#upload input[name=email]").fill(email);
    await p
      .locator("#upload")
      .getByRole("button", { name: "Log in.", exact: true })
      .click();
    assert.equal(
      await p.locator("#upload input[name=email]").inputValue(),
      email,
    );
    await p
      .locator("#upload")
      .getByRole("button", { name: "Create your free account.", exact: true })
      .click();
    assert.equal(
      await p.locator("#upload input[name=email]").inputValue(),
      email,
    );
    await p.locator("#upload input[name=name]").fill("QA Visitor");
    await p
      .locator("#upload input[name=password]")
      .fill("synthetic-test-password");
    await p
      .locator("#upload")
      .screenshot({
        path: `artifacts/account-journey/account-${width}.png`,
        style: ".site-header { visibility:hidden !important; }",
      });
    await p
      .getByRole("button", { name: "Create my free account", exact: true })
      .click();
    await p.locator("#hero-report-file").waitFor();
    assert.ok((await p.locator("#upload").innerText()).includes(email));
    assert.equal(await p.locator("#upload input[type=email]").count(), 0);
    await p
      .locator("#hero-report-file")
      .setInputFiles("artifacts/impact-edit-v2/simple-effective.pdf");
    await p.evaluate(() => window.dispatchEvent(new Event("focus")));
    await p.getByText("simple-effective.pdf", { exact: true }).waitFor();
    await p
      .getByRole("checkbox", { name: /I have permission to share this report/ })
      .check();
    await p
      .getByRole("button", { name: "Review my report — free", exact: true })
      .click();
    await p.locator(".review-choice").waitFor();
    assert.equal(
      bytes,
      (await fs.stat("artifacts/impact-edit-v2/simple-effective.pdf")).size,
    );
    assert.equal(
      await p.locator(".review-choice input[type=email]").count(),
      0,
    );
    await p
      .getByRole("button", {
        name: "Start Social Impact Claims Code — free",
        exact: true,
      })
      .click();
    await p
      .getByRole("heading", { name: "YOUR REVIEW IS UNDER WAY.", exact: true })
      .waitFor();
    for (const framework of ["claims", "excellence", "report"]) {
      const fixture = JSON.parse(
        await fs.readFile(`artifacts/${framework}-review.json`),
      );
      review = {
        ...fixture,
        framework,
        status: "running",
        result: null,
        full: false,
        emailEnabled: true,
        understanding_ready: true,
        siblings: [
          { id: fixture.id, framework, status: "running", has_result: false },
        ],
      };
      await p.goto(base + "/reviews/" + review.id, {
        waitUntil: "networkidle",
      });
      await p
        .getByRole("heading", {
          name: "YOUR REVIEW IS UNDER WAY.",
          exact: true,
        })
        .waitFor();
      assert.equal(await p.locator(".state-preparing").count(), 1);
      assert.equal(await p.locator(".state-not-started").count(), 2);
      assert.equal(await p.locator(".state-completed").count(), 0);
      const dot = p.locator(".state-preparing .workspace-state-dot");
      assert.equal(
        await dot.evaluate((e) => getComputedStyle(e).animationName),
        "preparing-pulse",
      );
      assert.equal(
        await p.locator(".review-email input[type=email]").count(),
        0,
      );
      assert.match(
        await p.locator(".preparation-account").innerText(),
        /returning@example.invalid/,
      );
      await p.screenshot({
        path: `artifacts/account-journey/${framework}-preparing-${width}.png`,
      });
      await p
        .getByRole("button", { name: "Explore the five pillars", exact: true })
        .click();
      await p
        .getByRole("button", { name: "The introduction", exact: true })
        .click();
      await p.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await dot.evaluate((e) => getComputedStyle(e).animationName),
        "none",
      );
      await p.emulateMedia({ reducedMotion: "no-preference" });
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      // A completed result changes state and exposes delivery to the already-known account email.
      review = {
        ...fixture,
        framework,
        status: "complete",
        full: false,
        emailEnabled: true,
        understanding_ready: true,
        siblings: [
          { id: fixture.id, framework, status: "complete", has_result: true },
        ],
      };
      await p.goto(base + "/reviews/" + review.id + "?results=1", {
        waitUntil: "networkidle",
      });
      await p.locator(".snapshot-heading").waitFor();
      assert.equal(await p.locator(".state-preparing").count(), 0);
      assert.equal(await p.locator(".state-completed").count(), 1);
      assert.equal(
        await p.locator(".review-email input[type=email]").count(),
        0,
      );
      assert.match(
        await p.locator(".remembered-email").innerText(),
        /returning@example.invalid/,
      );
      await p
        .getByRole("button", {
          name: "Confirm my email for delivery",
          exact: true,
        })
        .click();
      await p.getByText("Resend verification email", { exact: true }).waitFor();
      assert.equal(
        writes.filter((w) => w.path === "/api/save").at(-1).email,
        email,
      );
      // Failure cannot carry the working pulse or invented completion.
      review.status = "failed";
      review.result = null;
      review.siblings = [
        { id: review.id, framework, status: "failed", has_result: false },
      ];
      await p.goto(base + "/reviews/" + review.id, {
        waitUntil: "networkidle",
      });
      await p.locator(".state-needs-attention").waitFor();
      assert.equal(await p.locator(".state-preparing").count(), 0);
    }
    user.emailVerified = true;
    review = JSON.parse(await fs.readFile("artifacts/claims-review.json"));
    Object.assign(review, {
      framework: "claims",
      status: "complete",
      full: true,
      emailEnabled: true,
      understanding_ready: true,
      siblings: [
        {
          id: review.id,
          framework: "claims",
          status: "complete",
          has_result: true,
        },
      ],
    });
    await p.goto(base + "/reviews/" + review.id + "?results=1", {
      waitUntil: "networkidle",
    });
    assert.equal(await p.locator(".review-email input[type=email]").count(), 0);
    assert.match(
      await p.locator(".review-email").innerText(),
      /Delivery address: returning@example.invalid/,
    );
    // Returning sign-in uses the same account and returns to the requested workspace.
    user = null;
    await p.goto(
      base + "/login?next=" + encodeURIComponent("/reviews/" + review.id),
      { waitUntil: "networkidle" },
    );
    await p.locator(".simple-account > form input[name=email]").fill(email);
    await p
      .locator(".simple-account > form input[name=password]")
      .fill("synthetic-test-password");
    await p.getByRole("button", { name: "Log in", exact: true }).click();
    await p.waitForURL("**/reviews/" + review.id);
    await p.locator(".methodology-lesson").waitFor();
    const axe = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    assert.deepEqual(errors, []);
    checks.push({
      width,
      signupBeforeUpload: true,
      emailRemembered: true,
      returningLogin: true,
      threeFrameworkHeroes: true,
      accurateLiveStates: true,
      reducedMotion: true,
      axe: 0,
    });
    await c.close();
  }
  await fs.writeFile(
    "artifacts/account-journey/checks.json",
    JSON.stringify(checks, null, 2),
  );
  console.log(checks);
} finally {
  await b.close();
}
