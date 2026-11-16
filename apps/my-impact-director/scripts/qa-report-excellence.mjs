// Synthetic transport contracts. Real production processing/email are verified separately.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:3007";
await fs.mkdir("artifacts/ire", { recursive: true });
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(!base.includes("localhost") && process.env.HTTPS_PROXY
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
    for (const framework of ["report"]) {
      const r = JSON.parse(
        await fs.readFile(`artifacts/${framework}-review.json`, "utf8"),
      );
      r.full = false;
      r.emailEnabled = true;
      r.understanding_ready = true;
      const c = await b.newContext({
          viewport: { width, height },
          reducedMotion: width === 640 ? "reduce" : "no-preference",
        }),
        p = await c.newPage();
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await c.route("**/api/account", (route) =>
        route.fulfill({
          json: {
            user: {
              id: "synthetic",
              name: "",
              email: "",
              anonymous: true,
              founder: false,
            },
          },
        }),
      );
      await c.route("**/api/save", (route) =>
        route.fulfill({
          json:
            route.request().method() === "GET"
              ? { emailEnabled: true }
              : { ok: true },
        }),
      );
      await c.route("**/api/reviews/*", (route) =>
        route.fulfill({
          json: route.request().method() === "POST" ? { ok: true } : r,
        }),
      );
      await p.goto(base + "/reviews/" + r.id, { waitUntil: "networkidle" });
      await p.locator(".methodology-lesson").waitFor();
      const scroll = [];
      for (let step = 0; step < 7; step++) {
        await p.waitForTimeout(260);
        const geometry = await p.evaluate(() => {
          const el = document.querySelector(".lesson-scroll"),
            controls = document
              .querySelector(".lesson-controls")
              .getBoundingClientRect(),
            bar = document
              .querySelector(".permanent-actions")
              .getBoundingClientRect();
          return {
            documentHeight: document.documentElement.scrollHeight,
            height: innerHeight,
            width: document.documentElement.scrollWidth,
            viewport: innerWidth,
            internalScroll: el.scrollHeight - el.clientHeight,
            controlsBottom: controls.bottom,
            barTop: bar.top,
          };
        });
        assert.ok(geometry.width <= width + 1, JSON.stringify(geometry));
        assert.ok(
          geometry.documentHeight <= height + 2,
          JSON.stringify(geometry),
        );
        assert.ok(
          geometry.controlsBottom <= geometry.barTop + 1,
          JSON.stringify(geometry),
        );
        if (width >= 1280)
          assert.ok(
            geometry.internalScroll <= 2,
            `${framework} step ${step}: ${JSON.stringify(geometry)}`,
          );
        scroll.push(geometry.internalScroll);
        await p.screenshot({
          path: `artifacts/ire/${width}-${framework}-${step}.png`,
        });
        if (step < 6) {
          await p.getByRole("button", { name: "Next →", exact: true }).click();
          await p.waitForFunction(
            () => document.activeElement?.tagName === "H2",
          );
        }
      }
      await p.getByRole("button", { name: "← Previous", exact: true }).click();
      await p
        .getByRole("button", { name: "The introduction", exact: true })
        .click();
      await p
        .getByLabel("Email address", { exact: true })
        .fill("qa@example.invalid");
      await p
        .getByRole("button", { name: "Email me my full report", exact: true })
        .click();
      await p.getByText(/Check your inbox and confirm/).waitFor();
      await p.locator(".action-primary").click();
      await p.locator(".snapshot-heading").waitFor();
      assert.equal(await p.locator(".finding").count(), 0);
      const a = await new AxeBuilder({ page: p })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        a.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        [],
      );
      await p
        .getByRole("button", {
          name: "Return to the learning experience",
          exact: true,
        })
        .click();
      await p
        .getByRole("link", { name: "Back to My Impact Director", exact: false })
        .click();
      await p.waitForURL(base + "/");
      if (width < 1051) {
        await p.getByRole("button", { name: "Menu", exact: false }).click();
      }
      await p
        .locator("#main-nav")
        .getByRole("link", { name: "Contact Us", exact: true })
        .click();
      await p.waitForTimeout(1500);
      const contact = await p.locator("#contact").boundingBox();
      const header = await p.locator(".site-header").boundingBox();
      assert.ok(contact.y >= header.height - 2);
      assert.equal(
        await p
          .locator("#contact img")
          .evaluate((im) => im.complete && im.naturalWidth > 0),
        true,
      );
      assert.ok(
        (await p
          .locator('#contact a[href^="mailto:marcus@mysocialimpact.org"]')
          .count()) >= 1,
      );
      await p.screenshot({ path: `artifacts/ire/${width}-contact.png` });
      assert.deepEqual(errors, []);
      checks.push({ width, height, framework, internalScroll: scroll, errors });
      console.log(JSON.stringify(checks.at(-1)));
      await c.close();
    }
  }
} finally {
  await b.close();
  await fs.writeFile(
    "artifacts/ire/contracts.json",
    JSON.stringify(checks, null, 2),
  );
}
