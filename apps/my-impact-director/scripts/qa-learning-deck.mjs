import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.argv[2] || "http://localhost:3074";
const dir = "artifacts/learning-deck";
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const fixtures = Object.fromEntries(
  await Promise.all(
    ["claims", "excellence", "report"].map(async (f) => [
      f,
      JSON.parse(await fs.readFile(`artifacts/${f}-review.json`, "utf8")),
    ]),
  ),
);
const profiles = [
  { name: "laptop", width: 1366, height: 768 },
  { name: "large-laptop", width: 1440, height: 900 },
  { name: "desktop", width: 1920, height: 1080 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small-mobile", width: 320, height: 640 },
  { name: "zoom-200", width: 683, height: 384, zoom: true },
  { name: "large-text", width: 1366, height: 768, largeText: true },
];
const chosen = process.env.QA_PROFILES
  ? profiles.filter((v) => process.env.QA_PROFILES.split(",").includes(v.name))
  : process.env.QA_SMOKE
    ? profiles.filter((v) => ["laptop", "mobile"].includes(v.name))
    : profiles;
const observations = [],
  screens = [];
try {
  for (const v of chosen)
    for (const framework of ["claims", "excellence", "report"]) {
      const fixture = structuredClone(fixtures[framework]),
        result = fixture.result;
      Object.assign(fixture, {
        status: "processing",
        stage: framework === "report" ? 18 : 5,
        result: null,
        understanding_ready: true,
        full: true,
        emailEnabled: true,
      });
      const c = await browser.newContext({
          viewport: { width: v.width, height: v.height },
          deviceScaleFactor: v.zoom ? 2 : 1,
          reducedMotion: v.zoom ? "reduce" : "no-preference",
        }),
        p = await c.newPage(),
        errors = [],
        posts = [];
      let finished = false,
        reviewReads = 0;
      const assessment = () => ({
        id: fixture.id,
        framework,
        status: finished ? "complete" : "processing",
        has_result: finished,
        viewed: false,
        score: finished ? 75 : null,
        delivery: null,
      });
      await c.route("**/api/**", async (route) => {
        const req = route.request(),
          path = new URL(req.url()).pathname;
        if (v.largeText && path === "/api/workspace")
          await new Promise((resolve) => setTimeout(resolve, 350));
        if (req.method() === "POST")
          posts.push({ path, action: req.postDataJSON()?.action });
        const data =
          path === "/api/account"
            ? {
                user: {
                  id: "qa-learning",
                  name: "Learning visitor",
                  email: "qa@example.invalid",
                  passwordAccount: true,
                  emailVerified: true,
                  anonymous: false,
                  founder: false,
                },
              }
            : path === "/api/workspace"
              ? {
                  workspace: {
                    id: fixture.id,
                    root_id: fixture.id,
                    title: "Our impact report.pdf",
                    organisation: "Example organisation",
                    full: true,
                    assessments: [assessment()],
                  },
                }
              : path === "/api/save"
                ? { emailEnabled: true }
                : path.startsWith("/api/reviews/")
                  ? req.method() === "POST"
                    ? { ok: true }
                    : (reviewReads++,
                      {
                        ...fixture,
                        status: finished ? "complete" : fixture.status,
                        result: finished ? result : null,
                      })
                  : { ok: true };
        await route.fulfill({ json: data });
      });
      if (v.largeText)
        await p.addInitScript(() =>
          document.addEventListener("DOMContentLoaded", () => {
            document.documentElement.style.fontSize = "200%";
          }),
        );
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(base + "/reviews/" + fixture.id, {
        waitUntil: "networkidle",
      });
      await p.locator(".learning-deck").waitFor();
      await p.evaluate(() => document.fonts.ready);
      let navTop;
      for (let step = 0; step < 7; step++) {
        await p.waitForTimeout(v.zoom ? 30 : 300);
        const geometry = await p.evaluate(() => {
          const canvas = document.querySelector(".learning-canvas"),
            nav = document.querySelector(".learning-navigation"),
            heading = document.querySelector(".learning-statement h2"),
            example = document.querySelector(".learning-statement blockquote"),
            copy = document.querySelector(".learning-statement"),
            toolbar = document.querySelector(".learning-toolbar"),
            tracker = document.querySelector(".workspace-tracker");
          return {
            documentHeight: document.documentElement.scrollHeight,
            documentWidth: document.documentElement.scrollWidth,
            width: innerWidth,
            height: innerHeight,
            scroll: canvas.scrollHeight - canvas.clientHeight,
            canvasTop: canvas.getBoundingClientRect().top,
            canvasBottom: canvas.getBoundingClientRect().bottom,
            copyBottom: copy.getBoundingClientRect().bottom,
            navTop: nav.getBoundingClientRect().top,
            navBottom: nav.getBoundingClientRect().bottom,
            headingSize: parseFloat(getComputedStyle(heading).fontSize),
            toolbarTop: toolbar.getBoundingClientRect().top,
            trackerBottom: tracker.getBoundingClientRect().bottom,
            bottomBar: !!document.querySelector(".permanent-actions"),
            oldNav: !!document.querySelector(".lesson-controls"),
            headingCount: document.querySelectorAll(".learning-statement h2")
              .length,
            exampleBottom: example?.getBoundingClientRect().bottom,
          };
        });
        observations.push({ viewport: v.name, framework, step, ...geometry });
        assert.ok(
          geometry.documentWidth <= v.width + 1,
          JSON.stringify({ framework, step, ...geometry }),
        );
        assert.ok(
          geometry.documentHeight <= v.height + 2,
          JSON.stringify({ framework, step, ...geometry }),
        );
        if (v.width >= 1000 && !v.largeText)
          assert.ok(
            geometry.scroll <= 2,
            JSON.stringify({ framework, step, ...geometry }),
          );
        assert.ok(!geometry.bottomBar && !geometry.oldNav);
        assert.equal(geometry.headingCount, 1);
        assert.ok(geometry.toolbarTop >= geometry.trackerBottom - 1);
        if (step === 0) navTop = geometry.navTop;
        else
          assert.ok(
            Math.abs(geometry.navTop - navTop) < 2,
            "Navigation moved: " +
              JSON.stringify({ framework, step, ...geometry }),
          );
        if (geometry.scroll > 2) {
          await p.locator(".learning-canvas").focus();
          await p.keyboard.press("End");
          await p.waitForTimeout(300);
          const visible = await p.evaluate(() => {
            const canvas = document.querySelector(".learning-canvas"),
              last = document.querySelector(
                ".learning-statement",
              ).lastElementChild;
            return {
              bottom: last.getBoundingClientRect().bottom,
              edge: canvas.getBoundingClientRect().bottom,
              scroll: canvas.scrollTop,
            };
          });
          assert.ok(
            visible.scroll > 0 && visible.bottom <= visible.edge + 2,
            "Enlarged content must be reachable: " + JSON.stringify(visible),
          );
          await p
            .locator(".learning-canvas")
            .evaluate((el) => (el.scrollTop = 0));
        }
        if ([0, 1, 3, 5, 6].includes(step)) {
          const path = `${dir}/${v.name}-${framework}-${step}.png`;
          await p.screenshot({ path, fullPage: true });
          screens.push({ viewport: v.name, framework, step, path });
        }
        if (v.name === "laptop" && [0, 1, 3, 5, 6].includes(step)) {
          const a = await new AxeBuilder({ page: p })
            .include(".learning-deck")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze();
          assert.deepEqual(
            a.violations.map((x) => ({ id: x.id, impact: x.impact })),
            [],
          );
        }
        assert.equal(fixture.status, "processing");
        if (step < 6)
          await p.getByRole("button", { name: "Next →", exact: true }).click();
      }
      await p.keyboard.press("ArrowLeft");
      await p.waitForTimeout(300);
      assert.match(
        await p.locator(".learning-position").innerText(),
        /06 \/ 07/,
      );
      await p.keyboard.press("ArrowRight");
      await p.waitForTimeout(300);
      assert.match(
        await p.locator(".learning-position").innerText(),
        /07 \/ 07/,
      );
      // Real polling contract changes independently of the visitor's slide position.
      finished = true;
      await p.evaluate(() =>
        window.dispatchEvent(new Event("mid-review-refresh")),
      );
      await p.getByRole("button", { name: "View results ↗" }).waitFor();
      assert.match(
        await p.locator(".learning-position").innerText(),
        /07 \/ 07/,
      );
      await p.getByRole("button", { name: "← Previous", exact: true }).click();
      await p.getByRole("button", { name: "View results ↗" }).click();
      await p.locator(".snapshot-heading").waitFor();
      assert.equal(await p.locator(".learning-deck").count(), 0);
      await p
        .getByRole("button", { name: "Return to the learning experience" })
        .click();
      await p.locator(".learning-deck").waitFor();
      await p.locator(".permanent-actions").waitFor({ state: "detached" });
      assert.match(
        await p.locator(".learning-position").innerText(),
        /01 \/ 07/,
      );
      await p.getByRole("button", { name: "View results ↗" }).click();
      await p.locator(".snapshot-heading").waitFor();
      assert.deepEqual(
        posts.filter(
          (x) => x.path.startsWith("/api/reviews/") && x.action !== "snapshot",
        ),
        [],
      );
      assert.deepEqual(errors, []);
      await c.close();
      console.log(
        `${v.name} ${framework}: seven slides, navigation, ready results and return passed`,
      );
    }
  await fs.writeFile(
    dir + "/geometry.json",
    JSON.stringify(observations, null, 2),
  );
  // Each contact sheet contains the actual screenshots for five stages of all three frameworks.
  for (const v of chosen) {
    const page = await browser.newPage({
      viewport: { width: 1536, height: 1200 },
    });
    const items = screens.filter((s) => s.viewport === v.name);
    const cols = v.width < 1000 ? 5 : 3;
    const ordered =
      v.width < 1000
        ? ["claims", "excellence", "report"].flatMap((f) =>
            items.filter((s) => s.framework === f),
          )
        : [0, 1, 3, 5, 6].flatMap((step) =>
            items.filter((s) => s.step === step),
          );
    const cards = await Promise.all(
      ordered.map(
        async (s) =>
          `<figure><figcaption>${s.framework} · ${s.step + 1}/7</figcaption><img src="data:image/png;base64,${(await fs.readFile(s.path)).toString("base64")}" /></figure>`,
      ),
    );
    await page.setContent(
      `<html><head><style>body{margin:0;background:#ddd;font:16px Arial}main{display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;padding:8px}figure{margin:0}figcaption{padding:6px}img{width:100%;display:block}</style></head><body><main>${cards.join("")}</main></body></html>`,
    );
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode())),
    );
    await page.screenshot({
      path: dir + `/contact-${v.name}.png`,
      fullPage: true,
    });
    await page.close();
  }
  console.log(
    JSON.stringify({
      slides: observations.length,
      screenshots: screens.length,
      passed: true,
    }),
  );
} finally {
  await browser.close();
}
