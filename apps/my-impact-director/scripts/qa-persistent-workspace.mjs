import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:3074",
  dir = "artifacts/assessment-quality/navigation";
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
let checks = 0;
try {
  for (const anonymous of [false, true]) {
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
      }),
      p = await context.newPage();
    const fixture = JSON.parse(
      await fs.readFile("artifacts/claims-review.json", "utf8"),
    );
    let signedIn = true,
      selected = fixture.id;
    const workspace = () => ({
      id: "fcb2aada-50c2-4ea0-b5da-24d5a39d79db",
      root_id: fixture.id,
      title: "Selected private impact report.pdf",
      organisation: "QA organisation",
      full: !anonymous,
      assessments: [
        {
          id: fixture.id,
          framework: "claims",
          status: "complete",
          has_result: true,
          score: 75,
        },
        {
          id: "277732a8-d299-4334-8e51-b289d8507160",
          framework: "excellence",
          status: "running",
          has_result: false,
        },
        {
          id: "39202b6b-0b93-454f-bdb7-4316009a0bdd",
          framework: "report",
          status: "failed",
          has_result: false,
        },
      ],
    });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await context.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      let json = { ok: true };
      if (path === "/api/account")
        json = {
          user: signedIn
            ? {
                id: anonymous ? "qa-authorised-guest" : "qa-persistent-account",
                name: "QA visitor",
                anonymous,
                emailVerified: !anonymous,
                email: "qa@example.invalid",
              }
            : null,
        };
      else if (path === "/api/workspace") {
        if (req.method() === "PUT") selected = req.postDataJSON().review;
        json = { workspace: signedIn && selected ? workspace() : null };
      } else if (path === "/api/reviews")
        json = { workspaces: signedIn ? [workspace()] : [], reviews: [] };
      else if (path.startsWith("/api/reviews/"))
        json = {
          ...fixture,
          framework: "claims",
          status: "complete",
          full: true,
          emailEnabled: true,
          understanding_ready: true,
        };
      await route.fulfill({ json });
    });
    const routes = [
      "/reviews/" + fixture.id,
      "/",
      "/methodology",
      "/methodology/impact-report-excellence",
      "/contact",
      "/services",
      "/services/expert-review",
      "/reviews",
      "/reviews/" + fixture.id + "?results=1",
    ];
    for (const path of routes) {
      await p.goto(base + path, { waitUntil: "networkidle" });
      const strip = p.locator(".workspace-tracker");
      await strip.waitFor();
      await p.evaluate(() => document.fonts.ready);
      assert.match(
        await strip.innerText(),
        /Selected private impact report.pdf/,
      );
      for (const [status, action] of [
        ["Completed", "View results"],
        ["Preparing", "View progress"],
        ["Needs attention", "Retry review"],
      ]) {
        assert.match(await strip.innerText(), new RegExp(status));
        assert.match(await strip.innerText(), new RegExp(action));
      }
      const top = await strip.evaluate((x) => x.getBoundingClientRect().top);
      await p.evaluate(() => scrollTo(0, 500));
      assert.ok(
        Math.abs(
          (await strip.evaluate((x) => x.getBoundingClientRect().top)) - top,
        ) <= 1,
        "status stays beneath header",
      );
      await p.screenshot({
        path: `${dir}/${anonymous ? "guest" : "account"}-${path.split("?")[0].replaceAll("/", "-") || "home"}.png`,
      });
      checks++;
    }
    await p.evaluate(() => {
      window.__trackerMissing = false;
      window.__trackObserver = new MutationObserver(() => {
        if (!document.querySelector(".workspace-tracker"))
          window.__trackerMissing = true;
      });
      window.__trackObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
    await p
      .locator(".campaign-header")
      .getByRole("link", { name: "Contact", exact: true })
      .click();
    await p.waitForURL("**/contact");
    await p.waitForTimeout(400);
    assert.equal(
      await p.evaluate(() => window.__trackerMissing),
      false,
      "client navigation keeps the known report visible",
    );
    await p.evaluate(() => window.__trackObserver.disconnect());
    checks++;
    await p.reload({ waitUntil: "networkidle" });
    assert.match(
      await p.locator(".workspace-tracker").innerText(),
      /Selected private impact report.pdf/,
    );
    checks++;
    signedIn = false;
    await p.evaluate(() => dispatchEvent(new Event("mid-session-refresh")));
    await p.locator(".workspace-tracker").waitFor({ state: "detached" });
    checks++;
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(
    JSON.stringify({
      checks,
      authenticatedAndAuthorisedGuest: true,
      passed: true,
    }),
  );
} finally {
  await browser.close();
}
