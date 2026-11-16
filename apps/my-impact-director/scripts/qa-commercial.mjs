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
    [1440, 900],
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
      reviewFixture = null;
    p.on("pageerror", (e) => errors.push(e.message));
    await c.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
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
              : reviewFixture
                ? {
                    id: "synthetic-owner",
                    emailVerified: true,
                    anonymous: false,
                  }
                : null,
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
    await p
      .getByRole("heading", {
        name: "YOUR IMPACT DIRECTOR’S FIRST JOB IS READY.",
        exact: true,
      })
      .waitFor();
    const ready = p.locator(".first-job-ready"),
      bounds = await ready.boundingBox();
    assert.ok(
      bounds.y < height,
      "The first job should begin within the first screen",
    );
    assert.ok(
      await p
        .locator(".director-identity")
        .innerText()
        .then((t) => /building.*AI-powered.*human professionals/s.test(t)),
    );
    assert.equal(await p.locator(".permanent-actions").count(), 0);
    assert.equal(await p.locator(".report-offers > li").count(), 4);
    assert.equal(await p.locator(".monthly-pricing > li").count(), 3);
    assert.doesNotMatch(await p.locator("body").innerText(), /£49\b/);
    for (const price of ["£500", "£1,000", "£149", "£495", "£1,500"])
      assert.ok((await p.locator("body").innerText()).includes(price));
    await p.locator(".digital-offer").first().locator("summary").click();
    assert.match(
      await p.locator(".digital-offer").first().innerText(),
      /30 November 2026/,
    );
    assert.match(
      await p.locator(".digital-offer").first().innerText(),
      /cannot be combined/,
    );
    const subjects = [
      "Discuss my impact report",
      "Improve my existing report",
      "Digitise my impact report",
      "Prepare my next impact report",
    ];
    const links = p.locator(".report-offers .service-contact-action a");
    for (let i = 0; i < 4; i++) {
      const url = new URL(await links.nth(i).getAttribute("href"));
      assert.equal(url.pathname, "marcus@mysocialimpact.org");
      assert.equal(
        url.searchParams.get("subject"),
        "My Impact Director — " + subjects[i],
      );
      assert.equal(url.searchParams.has("body"), false);
    }
    await p.evaluate(() =>
      document.addEventListener(
        "click",
        (e) => {
          if (e.target.closest('a[href^="mailto:"]')) e.preventDefault();
        },
        { capture: true },
      ),
    );
    await links.nth(1).click();
    await p.waitForTimeout(200);
    assert.ok(
      events.some(
        (e) =>
          e.kind === "contact" &&
          e.service === "improvement" &&
          e.reviewId === null,
      ),
    );
    await p
      .getByRole("button", { name: "Copy email address", exact: true })
      .click();
    await p.getByText("Email address copied.", { exact: true }).waitFor();
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
    await p.reload({ waitUntil: "networkidle" });
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
        .getByRole("link", { name: "Log in", exact: true })
        .waitFor();
      await p.keyboard.press("Escape");
    }
    if (width === 1440) {
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
    if (width === 1440) {
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
            ? "Want to strengthen your impact claims?"
            : framework === "excellence"
              ? "What if someone helped you manage your impact throughout the year?"
              : "Your impact deserves to be brilliantly communicated.";
        await offers
          .getByRole("heading", { name: heading, exact: true })
          .waitFor();
        const a = offers.locator(".service-contact-action a").first();
        await p.evaluate(() =>
          document.addEventListener(
            "click",
            (e) => {
              if (e.target.closest('a[href^="mailto:"]')) e.preventDefault();
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
    assert.deepEqual(errors, []);
    checks.push({
      width,
      firstJobWithinFirstScreen: true,
      fourServices: true,
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
