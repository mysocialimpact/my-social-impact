import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:3074",
  fixture = JSON.parse(
    await fs.readFile("artifacts/report-review.json", "utf8"),
  ),
  root = "15e0a650-22a3-42fd-b03d-e80cf4e8f0c3";
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const c = await b.newContext(),
    p = await c.newPage();
  let starts = 0;
  const navigations = [];
  p.on("framenavigated", (f) => {
    if (f === p.mainFrame()) navigations.push(new URL(f.url()).pathname);
  });
  await c.route("**/api/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    let data;
    if (path === "/api/account") {
      await new Promise((r) => setTimeout(r, 700));
      data = {
        user: {
          id: "qa-session-race",
          name: "QA visitor",
          email: "qa@example.invalid",
          anonymous: false,
          passwordAccount: true,
          emailVerified: false,
        },
      };
    } else if (path === "/api/workspace")
      data = {
        workspace: {
          id: root,
          root_id: root,
          title: "QA report.pdf",
          organisation: "QA visitor",
          assessments: [],
        },
      };
    else if (path === "/api/reviews/" + root && req.method() === "POST") {
      assert.equal(req.postDataJSON().framework, "report");
      starts++;
      data = { id: fixture.id };
    } else if (path === "/api/save") data = { emailEnabled: true };
    else if (path === "/api/reviews/" + root)
      data = {
        ...fixture,
        id: root,
        framework: "document",
        status: "complete",
        result: null,
        siblings: [],
        understanding_ready: true,
        full: false,
      };
    else
      data = {
        ...fixture,
        framework: "report",
        status: "queued",
        result: null,
        version: "2.0.1-report",
        full: false,
        understanding_ready: true,
      };
    await route.fulfill({ json: data });
  });
  await p.goto(base + "/reviews/" + root, { waitUntil: "domcontentloaded" });
  await p.locator(".review-choice").waitFor();
  const button = p
    .locator(".review-choices > section")
    .nth(2)
    .getByRole("button");
  assert.equal(
    await button.isDisabled(),
    true,
    "assessment actions wait for the account check",
  );
  await button.click();
  await p.waitForURL("**/reviews/" + fixture.id, {
    waitUntil: "domcontentloaded",
  });
  await p.locator(".learning-deck").waitFor();
  assert.equal(starts, 1);
  assert.ok(navigations.every((x) => !x.startsWith("/login")));
  console.log(
    "Delayed signed-in account check: action waits, starts once and never redirects to signup.",
  );
} finally {
  await b.close();
}
