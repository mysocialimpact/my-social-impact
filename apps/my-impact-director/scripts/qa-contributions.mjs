// Browser contract/visual QA with clearly simulated Stripe. No card or real payment.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.argv[2] || "http://localhost:3075",
  dir = "artifacts/support/browser";
await fs.mkdir(dir, { recursive: true });
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
let checks = 0;
async function setup({
  width = 1366,
  height = 768,
  framework = "report",
  available = true,
  processing = false,
} = {}) {
  const fixture = JSON.parse(
    await fs.readFile(`artifacts/${framework}-review.json`, "utf8"),
  );
  Object.assign(fixture, {
    framework,
    status: processing ? "queued" : "complete",
    full: true,
    understanding_ready: true,
    emailEnabled: false,
  });
  if (framework === "report") {
    fixture.result = JSON.parse(
      await fs.readFile(
        "artifacts/assessment-quality/calibration/simple-effective-v2.0.1.json",
        "utf8",
      ),
    ).result;
    fixture.version = "2.0.1-report";
  }
  const c = await b.newContext({ viewport: { width, height } }),
    p = await c.newPage();
  let state = "pending",
    supported = false,
    starts = [],
    configs = 0,
    external = 0;
  await p.addInitScript(() => {
    // Only this test injects a Stripe contract fixture. It is never app code.
    window.Stripe = () => ({
      initEmbeddedCheckout: async (opts) => ({
        mount(node) {
          const target =
            typeof node === "string" ? document.querySelector(node) : node;
          const content = document.createElement("div");
          content.style =
            "border:1px solid #ccc;padding:24px;background:#fafafa";
          content.textContent = "Secure Stripe fields — simulated QA fixture";
          const button = document.createElement("button");
          button.textContent = "Simulate Stripe completion";
          button.type = "button";
          button.style = "display:block;margin-top:24px;padding:12px";
          button.onclick = () => opts.onComplete();
          content.append(button);
          target.append(content);
          this.element = content;
        },
        destroy() {
          this.element?.remove();
        },
      }),
    });
  });
  p.on("request", (r) => {
    if (/stripe\.com/.test(r.url())) external++;
  });
  await c.route("**/api/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    let data;
    if (path === "/api/account")
      data = {
        user: {
          id: "support-qa",
          name: "QA reviewer",
          email: "qa@example.invalid",
          emailVerified: true,
          founder: true,
        },
      };
    else if (path === "/api/workspace")
      data = {
        workspace: {
          id: fixture.report_id,
          root_id: fixture.id,
          title: fixture.title,
          organisation: fixture.organisation,
          assessments: [
            {
              id: fixture.id,
              framework,
              status: processing ? "running" : "complete",
              has_result: !processing,
            },
          ],
        },
      };
    else if (path === "/api/contributions" && req.method() === "GET") {
      configs++;
      data = {
        available,
        supported,
        scope: "fixture",
        report: fixture.report_id,
        maximum: 100000,
        legalName: "Fictional QA Merchant Ltd",
        merchant: "Fictional QA merchant",
      };
    } else if (path === "/api/contributions") {
      const input = req.postDataJSON();
      starts.push(input);
      state = "pending";
      data = {
        id: "8413802f-4a6a-444e-a232-d2ce6f0717c7",
        status: "pending",
        amount: Math.round(Number(input.amount) * 100),
        clientSecret: "fixture_not_a_real_secret",
        publishableKey: "pk_test_fixture",
        merchant: "Fictional QA Merchant Ltd",
      };
    } else if (path === "/api/contributions/status") {
      if (req.postDataJSON().cancel) state = "cancelled";
      if (state === "succeeded") supported = true;
      data = { status: state };
    } else if (path === "/api/save") data = { emailEnabled: false };
    else data = fixture;
    await route.fulfill({ json: data });
  });
  await p.goto(
    `${base}/reviews/${fixture.id}${processing ? "" : "?results=1"}`,
    { waitUntil: "domcontentloaded" },
  );
  await p
    .locator(processing ? ".learning-deck" : ".snapshot-heading")
    .waitFor({ state: processing ? "visible" : "attached" });
  return {
    c,
    p,
    fixture,
    starts,
    stats: () => ({ configs, external }),
    setState: (s) => {
      state = s;
    },
  };
}
try {
  for (const [width, height] of [
    [1366, 768],
    [1440, 900],
    [1920, 1080],
    [390, 844],
    [320, 640],
  ]) {
    const t = await setup({ width, height }),
      p = t.p;
    await p.locator(".contribution-panel").waitFor();
    await p
      .locator(".contribution-panel")
      .evaluate((el) =>
        el.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    await p.evaluate(() => document.fonts.ready);
    assert.equal(
      t.stats().external,
      0,
      "No Stripe requests before choosing to pay",
    );
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await p.screenshot({ path: `${dir}/invitation-${width}.png` });
    for (const amount of ["5", "10", "20"]) {
      await p.getByRole("radio", { name: `£${amount}`, exact: true }).check();
      assert.equal(
        await p
          .getByRole("radio", { name: `£${amount}`, exact: true })
          .isChecked(),
        true,
      );
    }
    await p.getByRole("radio", { name: "Other", exact: true }).check();
    await p.getByLabel("Amount in pounds (£)").fill("0.50");
    await p
      .getByRole("button", { name: "Support our work →", exact: true })
      .click();
    await p
      .getByRole("alert")
      .filter({ hasText: "Choose between £1" })
      .waitFor();
    assert.equal(t.starts.length, 0);
    await p.getByLabel("Amount in pounds (£)").fill("15.50");
    await p
      .getByRole("button", { name: "Support our work →", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Simulate Stripe completion" })
      .waitFor();
    assert.equal(t.starts[0].amount, "15.50");
    assert.ok(t.starts[0].attempt);
    await p
      .locator(".contribution-payment")
      .evaluate((el) =>
        el.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    await p.screenshot({ path: `${dir}/inline-fixture-${width}.png` });
    await p
      .getByRole("button", { name: "Check payment status", exact: true })
      .click();
    await p.getByRole("alert").filter({ hasText: "not confirmed" }).waitFor();
    assert.equal(await p.locator(".contribution-thanks").count(), 0);
    await p.getByRole("button", { name: "Close payment", exact: true }).click();
    await p
      .getByRole("button", { name: "Support our work →", exact: true })
      .waitFor();
    await p.getByRole("radio", { name: "£5", exact: true }).check();
    await p
      .getByRole("button", { name: "Support our work →", exact: true })
      .click();
    await p.getByRole("button", { name: "Simulate Stripe completion" }).click();
    await p.waitForTimeout(300);
    assert.equal(await p.locator(".contribution-thanks").count(), 0);
    t.setState("succeeded");
    await p.locator(".contribution-thanks").waitFor();
    await p.locator(".contribution-thanks").scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${dir}/thanks-${width}.png` });
    await p.reload({ waitUntil: "domcontentloaded" });
    await p.locator(".contribution-thanks").waitFor();
    assert.equal(await p.locator(".contribution-panel").count(), 0);
    checks++;
    await t.c.close();
  }
  for (const framework of ["claims", "excellence"]) {
    const t = await setup({ framework });
    await t.p.locator(".contribution-panel").waitFor();
    await t.c.close();
    checks++;
  }
  const off = await setup({ available: false });
  await off.p.waitForTimeout(300);
  assert.equal(await off.p.locator(".contribution-panel").count(), 0);
  await off.c.close();
  checks++;
  const pending = await setup({ processing: true });
  await pending.p.waitForTimeout(300);
  assert.equal(pending.stats().configs, 0);
  assert.equal(await pending.p.locator(".contribution-panel").count(), 0);
  await pending.c.close();
  checks++;
  const repeat = await setup();
  await repeat.p.locator(".contribution-panel").waitFor();
  await repeat.p.reload({ waitUntil: "domcontentloaded" });
  await repeat.p.locator(".contribution-discreet").waitFor();
  await repeat.p
    .getByRole("button", { name: /Help us keep good ideas free/ })
    .click();
  await repeat.p.locator(".contribution-panel").waitFor();
  const axe = await new AxeBuilder({ page: repeat.p })
    .include(".contribution-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })),
    [],
  );
  await repeat.c.close();
  checks++;
  console.log(
    JSON.stringify({
      checks,
      viewports: 5,
      allFrameworks: true,
      liveCharges: 0,
      provider:
        "simulated Stripe contract — actual Stripe test credentials still required",
    }),
  );
} finally {
  await b.close();
}
