// Current public-shell UX contracts. Historical two-level navigation was retired.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.argv[2] || "http://localhost:3014",
  live = base.startsWith("https");
await fs.mkdir("artifacts/simplify", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(live ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
});
try {
  for (const [width, height] of live || process.env.QA_SMOKE
    ? [
        [1366, 768],
        [390, 844],
      ]
    : [
        [1440, 900],
        [1366, 768],
        [1280, 720],
        [390, 844],
        [320, 750],
        [640, 400],
      ]) {
    const c = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
      }),
      p = await c.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    let signed = false;
    if (!live) {
      await c.route("**/api/account**", (r) => {
        if (r.request().url().includes("feature=password-reset"))
          return r.fulfill({ json: { available: true } });
        if (r.request().method() === "POST") {
          const d = r.request().postDataJSON();
          if (d.action === "login" && d.password === "wrong-password")
            return r.fulfill({
              status: 401,
              json: { error: "Check your email and password." },
            });
          if (["login", "signup"].includes(d.action)) signed = true;
          if (d.action === "logout") signed = false;
          return r.fulfill({ json: { ok: true } });
        }
        return r.fulfill({
          json: {
            user: signed
              ? {
                  id: "synthetic",
                  name: "QA",
                  email: "qa@example.invalid",
                  emailVerified: true,
                  passwordAccount: true,
                  anonymous: false,
                }
              : null,
          },
        });
      });
      await c.route("**/api/save", (r) =>
        r.fulfill({ json: { emailEnabled: true } }),
      );
      await c.route("**/api/reviews", (r) =>
        r.fulfill({ json: { reviews: [], workspaces: [] } }),
      );
      await c.route("**/api/workspace", (r) =>
        r.fulfill({ json: { ok: true } }),
      );
    }
    const publicShell = async () => {
      assert.equal(await p.locator(".section-navigation").count(), 0);
      assert.equal(await p.locator(".permanent-actions").count(), 0);
      assert.equal(
        await p.evaluate(() => getComputedStyle(document.body).paddingBottom),
        "0px",
      );
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `overflow ${width} ${p.url()}`,
      );
      assert.equal(
        await p
          .locator("header")
          .getByRole("link", { name: "Upload a report", exact: true })
          .isVisible(),
        true,
      );
    };
    await p.goto(base, { waitUntil: "networkidle" });
    await publicShell();
    assert.deepEqual(await p.locator("#main-nav a").allTextContents(), [
      "Contact",
      "My Reports",
      "Log in",
    ]);
    await p.evaluate(() => {
      window.__sameDocument = "yes";
    });
    await p
      .locator("header")
      .getByRole("link", { name: "Upload a report", exact: true })
      .click();
    await p.waitForURL(base + "/#upload");
    assert.equal(await p.evaluate(() => window.__sameDocument), "yes");
    assert.equal(
      await p.evaluate(() => document.activeElement?.id),
      "hero-report-file",
    );
    const headerBottom = await p
        .locator("header")
        .evaluate((e) => e.getBoundingClientRect().bottom),
      uploaderTop = await p
        .locator("#upload")
        .evaluate((e) => e.getBoundingClientRect().top);
    assert.ok(uploaderTop >= headerBottom - 1);
    assert.equal(await p.locator(".assessment-method").count(), 3);
    for (const d of await p.locator(".assessment-method").all()) {
      await d.locator("summary").click();
      assert.equal(await d.evaluate((e) => e.open), true);
      await d.locator("summary").click();
    }
    assert.equal(await p.locator(".simple-pricing details").count(), 5);
    const tier = p.locator("#director details");
    await tier.locator("summary").click();
    assert.equal(await tier.evaluate((e) => e.open), true);
    assert.equal(
      await tier
        .getByRole("link", { name: /Enquire about Director/ })
        .getAttribute("href"),
      "/services/director#enquire",
    );
    await p.goto(base, { waitUntil: "networkidle" });
    await p.evaluate(async () => {
      for (const img of document.images) img.loading = "eager";
      await Promise.all([...document.images].map((img) => img.decode()));
    });
    await p.screenshot({
      path: `artifacts/simplify/${live ? "live" : "local"}-home-${width}.png`,
      fullPage: true,
    });
    if (width <= 700) await p.getByRole("button", { name: /Menu/ }).click();
    await p
      .locator("#main-nav")
      .getByRole("link", { name: "Contact", exact: true })
      .click();
    await p.waitForURL(base + "/contact");
    await publicShell();
    await p.getByRole("heading", { level: 1, name: /Let’s talk/ }).waitFor();
    assert.equal(
      await p.getByRole("link", { name: "Email Marcus", exact: true }).count(),
      1,
    );
    await p
      .locator("header")
      .getByRole("link", { name: "Upload a report", exact: true })
      .click();
    await p.waitForURL(base + "/#upload");
    await p.goBack({ waitUntil: "networkidle" });
    assert.equal(new URL(p.url()).pathname, "/contact");
    await p.goForward({ waitUntil: "networkidle" });
    await p.waitForURL(base + "/#upload");
    assert.equal(new URL(p.url()).hash, "#upload");
    await p.goto(base + "/login", { waitUntil: "networkidle" });
    await publicShell();
    await p
      .getByRole("heading", { level: 1, name: "Log in.", exact: true })
      .waitFor();
    const form = p.locator(".simple-account > form");
    assert.equal(await form.locator("input[type=password]").isVisible(), true);
    await p
      .getByRole("button", { name: "Create your free account.", exact: true })
      .click();
    await p
      .getByRole("heading", {
        level: 1,
        name: "Create your free account.",
        exact: true,
      })
      .waitFor();
    await form.getByLabel("Your name", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Log in.", exact: true }).click();
    if ([1366, 390].includes(width)) {
      const a = await new AxeBuilder({ page: p }).analyze();
      if (a.violations.length)
        console.log(
          a.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.html),
          })),
        );
      assert.deepEqual(
        a.violations.map((v) => v.id),
        [],
      );
      await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await p.screenshot({
        path: `artifacts/simplify/${live ? "live" : "local"}-login-${width}.png`,
      });
    }
    if (!live) {
      await form
        .getByLabel("Email address", { exact: true })
        .fill("qa@example.invalid");
      await form.getByLabel("Password", { exact: true }).fill("wrong-password");
      await form.getByRole("button", { name: "Log in", exact: true }).click();
      await p
        .getByRole("alert")
        .filter({ hasText: "Check your email" })
        .waitFor();
      await form
        .getByLabel("Password", { exact: true })
        .fill("synthetic-long-password");
      await form.getByRole("button", { name: "Log in", exact: true }).click();
      await p.waitForURL(base + "/reviews");
      await p
        .locator("#main-nav")
        .getByRole("link", {
          name: "Account",
          exact: true,
          includeHidden: true,
        })
        .waitFor({ state: "attached" });
      await publicShell();
      await p.goto(base + "/account", { waitUntil: "networkidle" });
      await p.getByRole("button", { name: "Log out", exact: true }).click();
      await p.waitForURL(base + "/");
      signed = false;
    }
    const old = await c.request.get(base + "/review", { maxRedirects: 0 });
    assert.equal(old.status(), 308);
    assert.equal(old.headers().location, "/#upload");
    await p.goto(base + "/your-impact-director", { waitUntil: "networkidle" });
    assert.equal(new URL(p.url()).pathname, "/");
    assert.equal(new URL(p.url()).hash, "#human-support");
    await p.goto(
      base +
        "/your-impact-director?interest=director&review=12345678-1234-4234-8234-123456789012",
      { waitUntil: "networkidle" },
    );
    assert.equal(new URL(p.url()).pathname, "/services/director");
    assert.equal(
      new URL(p.url()).searchParams.get("review"),
      "12345678-1234-4234-8234-123456789012",
    );
    await publicShell();
    await p.goto(base + "/methodology/impact-report-excellence", {
      waitUntil: "networkidle",
    });
    await publicShell();
    await p
      .getByRole("heading", {
        level: 1,
        name: "Impact Report Excellence Methodology v1.0",
        exact: true,
      })
      .waitFor();
    await p.goto(base + "/forgot-password", { waitUntil: "networkidle" });
    await publicShell();
    await p
      .getByRole("button", { name: "Send reset instructions", exact: true })
      .waitFor();
    if (!live) {
      await p
        .getByLabel("Email address", { exact: true })
        .fill("qa@example.invalid");
      await p
        .getByRole("button", { name: "Send reset instructions", exact: true })
        .click();
      await p
        .getByRole("heading", { name: "Check your inbox.", exact: true })
        .waitFor();
    }
    assert.deepEqual(errors, []);
    console.log({
      width,
      height,
      canonicalUpload: true,
      unclutteredShell: true,
      passwordLogin: true,
      registration: true,
      redirects: true,
      history: true,
      legacyMethodology: true,
    });
    await c.close();
  }
} finally {
  await browser.close();
}
