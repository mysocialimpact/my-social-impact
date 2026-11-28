// Safe UI contracts: all APIs are intercepted; no live assessment, email or production enquiry is created.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.argv[2] || "http://localhost:3031";
await fs.mkdir("artifacts/commercial", { recursive: true });
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
    [1920, 1080],
    [1366, 768],
    [390, 844],
    [320, 812],
  ]) {
    const c = await browser.newContext({
        viewport: { width, height },
        permissions: ["clipboard-read", "clipboard-write"],
      }),
      p = await c.newPage(),
      events = [],
      errors = [];
    let founderMode = false,
      guestUpload = false,
      uploadedBytes = 0,
      reviewFixture = null;
    p.on("pageerror", (e) => errors.push(e.message));
    await c.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/visitor") return route.fulfill({ json: { ok: true } });
      if (path === "/api/uploads")
        return route.fulfill({
          json: { id: "synthetic-upload", chunkSize: 3000000 },
        });
      if (path === "/api/uploads/synthetic-upload") {
        if (route.request().method() === "PUT")
          uploadedBytes += route.request().postDataBuffer().length;
        return route.fulfill({ json: { id: reviewFixture.id } });
      }
      if (
        guestUpload &&
        path.startsWith("/api/reviews/") &&
        route.request().method() === "POST"
      ) {
        reviewFixture.framework = route.request().postDataJSON().framework;
        reviewFixture.status = "queued";
        reviewFixture.siblings = [
          {
            id: reviewFixture.id,
            framework: reviewFixture.framework,
            status: "queued",
            has_result: false,
          },
        ];
        return route.fulfill({ json: { id: reviewFixture.id } });
      }
      if (path === "/api/account")
        return route.fulfill({
          json: {
            user: founderMode
              ? {
                  id: "synthetic-founder",
                  founder: true,
                  emailVerified: true,
                  anonymous: false,
                }
              : guestUpload
                ? {
                    id: "synthetic-account",
                    email: "qa@example.invalid",
                    anonymous: false,
                    emailVerified: false,
                  }
                : reviewFixture
                  ? {
                      id: "synthetic-owner",
                      emailVerified: true,
                      anonymous: false,
                    }
                  : {
                      id: "synthetic-account",
                      email: "qa@example.invalid",
                      anonymous: false,
                      emailVerified: false,
                    },
          },
        });
      if (path === "/api/service-intents") {
        events.push(route.request().postDataJSON());
        return route.fulfill({
          json: { recorded: "intent_only", emailSent: false },
        });
      }
      if (path === "/api/admin")
        return route.fulfill({
          json: {
            metrics: {
              users: "1",
              uploads: "1",
              organisations: "1",
              reviews: "1",
              completed: "1",
              pending: "0",
              failed: "0",
              enquiries: "0",
              cost_usd: "0",
              enquirers: "0",
              reviewed_users: "1",
            },
            users: [],
            reviews: [],
            enquiries: [],
            usage: [{ event: "service_cta_click", count: "1" }],
            deliveries: [],
            intents: [
              {
                id: "synthetic",
                action: "service-intent:improvement",
                source: "review",
                review_id: "private",
                created_at: new Date().toISOString(),
                name: "Synthetic owner",
                email: "qa@example.invalid",
              },
            ],
          },
        });
      if (reviewFixture && path.startsWith("/api/reviews/"))
        return route.fulfill({
          json:
            route.request().method() === "POST" ? { ok: true } : reviewFixture,
        });
      if (reviewFixture && path.startsWith("/api/workspace"))
        return route.fulfill({
          json: {
            workspace: {
              id: reviewFixture.id,
              root_id: reviewFixture.id,
              title: reviewFixture.title,
              full: true,
              assessments: reviewFixture.siblings,
            },
          },
        });
      if (path === "/api/save")
        return route.fulfill({ json: { emailEnabled: false } });
      throw Error("Unexpected API in commercial UI test " + path);
    });
    const response = await p.goto(base, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    await p.locator(".meet-director").waitFor();
    const cue = await p.locator(".first-job-cue").boundingBox();
    assert.ok(
      cue.y < height + 80,
      "First-job invitation is visible near the opening screen",
    );
    assert.match(
      await p.locator(".meet-proposition").innerText(),
      /building.*AI.*human professionals/s,
    );
    assert.equal(await p.locator(".creative-home > section").count(), 5);
    assert.equal(await p.locator('input[type="file"]').count(), 1);
    assert.equal(await p.locator(".studio-framework").count(), 3);
    for (const d of await p.locator(".assessment-method").all()) {
      assert.equal(await d.getAttribute("open"), null);
      await d.locator("summary").focus();
      await p.keyboard.press("Enter");
      assert.notEqual(await d.getAttribute("open"), null);
      await p.waitForTimeout(250);
      assert.ok(await d.locator("a").isVisible());
      await p.keyboard.press("Enter");
      assert.equal(await d.getAttribute("open"), null);
    }
    assert.equal(await p.locator(".permanent-actions").count(), 0);
    assert.equal(await p.locator(".report-offers > li").count(), 3);
    assert.equal(await p.locator(".monthly-pricing > li").count(), 3);
    assert.doesNotMatch(await p.locator("body").innerText(), /£49\b/);
    for (const price of ["£500", "£1,000", "£149", "£495", "£1,500"])
      assert.ok((await p.locator("body").innerText()).includes(price));
    await p.locator(".digital-offer").first().locator("summary").click();
    await p.waitForTimeout(250);
    assert.match(
      await p.locator(".digital-offer").first().innerText(),
      /30 November 2026/,
    );
    assert.match(
      await p.locator(".digital-offer").first().innerText(),
      /cannot be combined/,
    );
    await p.locator(".digital-offer summary").click();
    const services = ["discussion", "improvement", "preparation"];
    const subjects = [
      "Discuss my impact report",
      "Improve or digitise my report",
      "Prepare my next impact report",
    ];
    for (let i = 0; i < 3; i++) {
      const a = p.locator(".report-offers .service-contact-action a").nth(i);
      assert.equal(
        await a.getAttribute("href"),
        "/about?service=" + services[i] + "#contact",
      );
      await a.click();
      await p.waitForURL("**/about?service=" + services[i] + "#contact");
      assert.equal(
        await p.locator("#contact select").inputValue(),
        services[i],
      );
      const email = p
        .locator("#contact address a")
        .filter({ hasText: "marcus@" });
      const url = new URL(await email.getAttribute("href"));
      assert.equal(url.pathname, "marcus@mysocialimpact.org");
      assert.equal(
        url.searchParams.get("subject"),
        "My Impact Director — " + subjects[i],
      );
      assert.deepEqual([...url.searchParams.keys()], ["subject"]);
      await p
        .getByRole("button", {
          name: "Copy Marcus’s email address",
          exact: true,
        })
        .click();
      await p.getByText("Email address copied.", { exact: true }).waitFor();
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      if (i === 1)
        await p.screenshot({
          path: `artifacts/commercial/contact-route-${width}.png`,
          fullPage: true,
        });
      await p.goto(base, { waitUntil: "networkidle" });
    }
    for (const service of [
      "supported",
      "director",
      "bespoke",
      "human-director",
    ]) {
      if (service !== "human-director")
        await p.locator("#" + service + " summary").click();
      await p
        .locator(`.chapter-support a[href="/about?service=${service}#contact"]`)
        .click();
      await p.waitForURL("**/about?service=" + service + "#contact");
      assert.equal(await p.locator("#contact select").inputValue(), service);
      assert.match(
        decodeURIComponent(
          await p
            .locator("#contact address a")
            .filter({ hasText: "marcus@" })
            .getAttribute("href"),
        ),
        /Ongoing support enquiry/,
      );
      await p.goto(base, { waitUntil: "networkidle" });
    }
    assert.ok(
      events.some(
        (e) =>
          e.kind === "contact" &&
          e.service === "improvement" &&
          e.reviewId === null,
      ),
    );
    const nav = p.locator(".header-review");
    assert.equal((await nav.innerText()).trim(), "Try your first free review");
    await nav.click();
    await p.waitForTimeout(400);
    assert.equal(new URL(p.url()).hash, "#upload");
    assert.equal(
      await p
        .locator("#hero-report-file")
        .evaluate((e) => document.activeElement === e),
      true,
    );
    await p
      .locator("#hero-report-file")
      .setInputFiles("artifacts/impact-edit-v2/simple-effective.pdf");
    await p.getByText("simple-effective.pdf", { exact: true }).waitFor();
    reviewFixture = JSON.parse(
      await fs.readFile("artifacts/claims-review.json", "utf8"),
    );
    Object.assign(reviewFixture, {
      framework: "document",
      status: "ingested",
      result: null,
      full: false,
      emailEnabled: true,
      understanding_ready: true,
      siblings: [],
    });
    guestUpload = true;
    await p
      .getByRole("checkbox", { name: /I have permission to share this report/ })
      .check();
    await p
      .getByRole("button", { name: "Review my report — free", exact: true })
      .click();
    await p.locator(".review-choice").waitFor();
    assert.equal(
      uploadedBytes,
      (await fs.stat("artifacts/impact-edit-v2/simple-effective.pdf")).size,
    );
    assert.equal(await p.locator(".review-choices > section").count(), 3);
    await p
      .getByRole("button", {
        name: "Start Social Impact Claims Code — free",
        exact: true,
      })
      .click();
    await p.locator(".methodology-lesson").waitFor();
    assert.equal(reviewFixture.framework, "claims");
    guestUpload = false;
    reviewFixture = null;
    await p.goto(base, { waitUntil: "networkidle" });
    await p.evaluate(() => scrollTo(0, 0));
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await p.evaluate(async () => {
      for (const img of document.images) img.loading = "eager";
      await Promise.all(
        [...document.images].map((img) => img.decode().catch(() => {})),
      );
    });
    assert.equal(
      await p.evaluate(
        () => [...document.images].filter((img) => !img.naturalWidth).length,
      ),
      0,
      "all genuine portraits and brand images load",
    );
    for (const section of await p.locator(".creative-home > section").all()) {
      await section.scrollIntoViewIfNeeded();
      await p.waitForTimeout(400);
      await section.screenshot({
        style: ".site-header { visibility: hidden !important; }",
        path: `artifacts/commercial/${await section.getAttribute("id")}-${width}.png`,
      });
    }
    await p.evaluate(() => scrollTo(0, 0));
    await p.waitForTimeout(400);
    await p.screenshot({
      path: `artifacts/commercial/home-${width}.png`,
      fullPage: true,
    });
    await p.evaluate(() => scrollTo(0, 0));
    await p.screenshot({ path: `artifacts/commercial/hero-${width}.png` });
    const axe = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.html),
      })),
      [],
    );
    if (width === 390) {
      await p.getByRole("button", { name: /Menu/ }).click();
      await p
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "Account", exact: true })
        .waitFor();
      await p.keyboard.press("Escape");
    }
    if (width === 1920) {
      for (const path of [
        "/services/discussion",
        "/services/improvement",
        "/services/digitisation",
        "/services/preparation",
        "/services/supported",
        "/services/director",
        "/services/bespoke",
        "/contact",
      ]) {
        const r = await p.goto(base + path, { waitUntil: "networkidle" });
        assert.equal(r.status(), 200);
        assert.equal(await p.locator("h1").count(), 1);
        assert.ok(
          await p
            .locator('a[href^="mailto:marcus@mysocialimpact.org"]')
            .count(),
        );
        assert.ok(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
      await p.goto(base + "/services/essentials", { waitUntil: "networkidle" });
      assert.equal(new URL(p.url()).pathname, "/");
    }
    if (width === 1920) {
      for (const framework of ["claims", "excellence", "report"]) {
        reviewFixture = JSON.parse(
          await fs.readFile(`artifacts/${framework}-review.json`, "utf8"),
        );
        Object.assign(reviewFixture, {
          framework,
          full: true,
          emailEnabled: false,
          status: "complete",
          understanding_ready: true,
        });
        reviewFixture.siblings = [
          {
            id: reviewFixture.id,
            framework,
            status: "complete",
            has_result: true,
          },
        ];
        await p.goto(base + "/reviews/" + reviewFixture.id + "?results=1", {
          waitUntil: "networkidle",
        });
        const offers = p.locator(".contextual-offers");
        await offers.waitFor();
        const heading =
          framework === "claims"
            ? "Good claims build trust."
            : framework === "excellence"
              ? "Impact deserves to be managed."
              : "Your impact deserves to be seen.";
        await offers
          .getByRole("heading", { name: heading, exact: true })
          .waitFor();
        const a = offers.locator(".service-contact-action a").first();
        await p.evaluate(() =>
          document.addEventListener(
            "click",
            (e) => {
              if (
                e.target.closest(".contextual-offers .service-contact-action a")
              )
                e.preventDefault();
            },
            { capture: true },
          ),
        );
        await a.click();
        await p.waitForTimeout(100);
        assert.equal(events.at(-1).reviewId, null);
        await offers.locator('input[type="checkbox"]').first().check();
        await a.click();
        await p.waitForTimeout(100);
        assert.equal(events.at(-1).reviewId, reviewFixture.id);
      }
      reviewFixture = null;
      founderMode = true;
      await p.goto(base + "/admin", { waitUntil: "networkidle" });
      await p
        .getByRole("heading", {
          name: "Contact intent · not received enquiries",
          exact: true,
        })
        .waitFor();
      await p
        .getByText("Review reference linked by choice; findings private", {
          exact: true,
        })
        .waitFor();
      assert.equal(
        await p
          .getByRole("button", { name: "Inspect linked review", exact: true })
          .count(),
        0,
      );
      await p
        .getByText(/Confirmed paid clients and revenue: not recorded/)
        .waitFor();
    }
    await p.goto(base, { waitUntil: "networkidle" });
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.reload({ waitUntil: "networkidle" });
    await p.locator(".header-review").click();
    assert.equal(
      await p
        .locator("#hero-report-file")
        .evaluate((el) => document.activeElement === el),
      true,
    );
    await p.locator(".assessment-method summary").first().click();
    await p.waitForTimeout(100);
    assert.equal(
      await p.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === "running")
            .length,
      ),
      0,
    );
    assert.equal(await p.locator(".creative-home > section").count(), 5);
    assert.deepEqual(errors, []);
    checks.push({
      width,
      fiveChapters: true,
      threeServices: true,
      sevenContextualContactRoutes: true,
      threeMonthlyTiers: true,
      workingUploadShortcut: true,
      contactIntentOnly: true,
      axe: 0,
    });
    await c.close();
  }
  await fs.writeFile(
    "artifacts/commercial/checks.json",
    JSON.stringify(checks, null, 2),
  );
  console.log(checks);
} finally {
  await browser.close();
}
