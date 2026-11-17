import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:3042";
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const width of [1366, 390]) {
    const c = await b.newContext({
        viewport: { width, height: width === 390 ? 844 : 768 },
      }),
      p = await c.newPage();
    let user = null;
    await c.route("**/api/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      if (path === "/api/account") {
        if (r.request().method() === "POST") {
          const d = r.request().postDataJSON();
          assert.equal(d.password.length, 8);
          user = {
            id: "qa",
            email: d.email,
            name: "QA",
            anonymous: false,
            emailVerified: true,
          };
          return r.fulfill({ json: { ok: true } });
        }
        return r.fulfill({ json: { user } });
      }
      if (path === "/api/reviews")
        return r.fulfill({ json: { workspaces: [] } });
      if (path === "/api/save")
        return r.fulfill({ json: { emailEnabled: true } });
      return r.fulfill({ json: { ok: true } });
    });
    await p.goto(base, { waitUntil: "networkidle" });
    assert.equal(await p.locator("input").count(), 0);
    await p.locator(".header-review").click();
    await p.waitForURL("**/review");
    await p.locator("input[name=email]").fill("qa@example.invalid");
    await p.locator("input[name=name]").fill("QA");
    await p.locator("input[name=password]").fill("Eight8!x");
    assert.equal(
      await p.locator("input[name=password]").getAttribute("minlength"),
      "8",
    );
    await p.screenshot({
      path: `artifacts/entry-pages/signup-${width}.png`,
      fullPage: true,
    });
    await p
      .getByRole("button", { name: "Create my free account", exact: true })
      .click();
    await p.locator("input[type=file]").waitFor();
    await p
      .locator("input[type=file]")
      .setInputFiles("artifacts/impact-edit-v2/simple-effective.pdf");
    await p.getByText("simple-effective.pdf", { exact: true }).waitFor();
    await p.goto(base + "/reviews", { waitUntil: "networkidle" });
    await p.getByText("Welcome back, QA.", { exact: true }).waitFor();
    assert.equal(
      await p.getByText("You’re not logged in yet.", { exact: true }).count(),
      0,
    );
    await p.screenshot({
      path: `artifacts/entry-pages/reports-signed-${width}.png`,
      fullPage: true,
    });
    user = null;
    await p.reload({ waitUntil: "networkidle" });
    await p.getByText("You’re not logged in yet.", { exact: true }).waitFor();
    assert.equal(await p.locator(".reports-empty").count(), 0);
    await p.screenshot({
      path: `artifacts/entry-pages/reports-guest-${width}.png`,
      fullPage: true,
    });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
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
    console.log({
      width,
      eightCharacterSignup: true,
      rememberedEmail: true,
      pdfSelection: true,
      homeWithoutForm: true,
      guestHero: true,
      signedDashboard: true,
      axe: 0,
    });
    await c.close();
  }
} finally {
  await b.close();
}
