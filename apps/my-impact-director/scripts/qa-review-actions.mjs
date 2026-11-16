// Mocked interaction contracts; no email is sent.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
const base = process.argv[2] || "http://localhost:3005";
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(!base.includes("localhost") && process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const checks = [];
try {
  for (const width of [1366, 390]) {
    const r = JSON.parse(
      await fs.readFile("artifacts/claims-review.json", "utf8"),
    );
    r.status = "running";
    r.full = false;
    r.emailEnabled = true;
    let emails = 0,
      retries = 0,
      reuseMode = false;
    const c = await b.newContext({ viewport: { width, height: 844 } }),
      p = await c.newPage();
    await c.route("**/api/account", (x) =>
      x.fulfill({
        json: { user: { id: "synthetic", anonymous: true, email: "" } },
      }),
    );
    await c.route("**/api/save", (x) => {
      if (x.request().method() === "GET")
        return x.fulfill({ json: { emailEnabled: true } });
      emails++;
      return emails === 1
        ? x.fulfill({
            status: 503,
            json: {
              error:
                "We’re sorry — delivery could not be confirmed. Please try again.",
            },
          })
        : x.fulfill({ json: { ok: true, verified: reuseMode } });
    });
    await c.route("**/api/reviews/*", (x) => {
      if (x.request().method() === "POST") {
        if (x.request().postDataJSON()?.action === "retry-delivery") {
          retries++;
          r.delivery = { state: "pending", attempts: 7 };
          setTimeout(() => {
            r.delivery = { state: "accepted", attempts: 8 };
          }, 200);
        }
        return x.fulfill({ json: { ok: true } });
      }
      return x.fulfill({ json: r });
    });
    await p.goto(base + "/reviews/" + r.id, { waitUntil: "networkidle" });
    await p.getByRole("button", { name: "Next →", exact: true }).click();
    await p.locator(".action-primary").click();
    const dialog = p.getByRole("dialog");
    await dialog.waitFor();
    await dialog
      .getByLabel("Email address", { exact: true })
      .fill("qa@example.invalid");
    await dialog
      .getByRole("button", { name: "Email me my full report", exact: true })
      .click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(
      await dialog.getByLabel("Email address", { exact: true }).inputValue(),
      "qa@example.invalid",
    );
    await dialog
      .getByRole("button", { name: "Email me my full report", exact: true })
      .click();
    await dialog.getByText(/Check your inbox and confirm/).waitFor();
    await p.screenshot({
      path: `artifacts/immersive/${width}-email-options.png`,
    });
    await p.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    r.status = "complete";
    await p
      .getByRole("link", { name: "View results", exact: true })
      .waitFor({ timeout: 15000 });
    await p.locator(".action-primary").click();
    await p.locator(".snapshot-heading").waitFor();
    assert.equal(await p.locator(".finding").count(), 0);
    r.full = true;
    r.delivery = { state: "failed", attempts: 8 };
    await p.reload({ waitUntil: "networkidle" });
    assert.equal(await p.locator("input[name=email]").count(), 0);
    await p
      .getByRole("button", { name: "Retry email delivery", exact: true })
      .click();
    assert.equal(retries, 1);
    await p
      .getByText(/The email service has accepted/)
      .waitFor({ timeout: 15000 });
    r.full = false;
    delete r.delivery;
    reuseMode = true;
    await p.reload({ waitUntil: "networkidle" });
    await p
      .getByLabel("Email address", { exact: true })
      .fill("qa@example.invalid");
    await p
      .getByRole("button", { name: "Email me my full report", exact: true })
      .click();
    await p
      .getByRole("heading", { name: "Email confirmed.", exact: true })
      .waitFor();
    assert.equal(await p.locator("input[name=email]").count(), 0);
    const a = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      a.violations.map((v) => v.id),
      [],
    );
    await p.goto(base + "/#contact", { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    const g = await p.evaluate(() => ({
      contact: document.querySelector("#contact").getBoundingClientRect().top,
      header: document.querySelector(".site-header").getBoundingClientRect()
        .bottom,
    }));
    assert.ok(
      g.contact >= g.header - 2 && g.contact < g.header + 70,
      JSON.stringify(g),
    );
    checks.push({
      width,
      emailRetry: true,
      dialogKeyboardClose: true,
      readyResults: true,
      deliveryRetry: true,
      acceptedStatus: true,
      reusedVerificationIsImmediate: true,
      contact: g,
      axeViolations: 0,
    });
    console.log(JSON.stringify(checks.at(-1)));
    await c.close();
  }
} finally {
  await b.close();
  await fs.writeFile(
    "artifacts/immersive/action-contracts.json",
    JSON.stringify(checks, null, 2),
  );
}
