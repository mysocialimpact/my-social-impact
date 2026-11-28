import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import { database, query } from "../src/lib/db";
import { tokenHash } from "../src/lib/access";
import { FOUNDER_OWNER } from "../src/lib/founder-policy";
assert.equal(
  new URL(process.env.DATABASE_URL!).pathname,
  "/my_impact_director_validation",
);
const base = "http://localhost:3000",
  prefix = "signin-browser-qa-" + randomUUID(),
  directory = "artifacts/signin-founder";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
let createdFounder = false;
const tokens: string[] = [];
async function session(id: string) {
  const token = randomBytes(32).toString("base64url");
  tokens.push(tokenHash(token));
  await query(
    "INSERT INTO director.access_sessions(token_hash,owner_id,kind,expires_at) VALUES($1,$2,'email',now()+interval '1 hour')",
    [tokenHash(token), id],
  );
  return {
    name: "mid_saved",
    value: token,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: false,
  };
}
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
      }),
      page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Visual fixture enables the three choices without pretending OAuth is configured.
    await page.route("**/api/account/options", (r) =>
      r.fulfill({ json: { google: true, apple: true, email: true } }),
    );
    await page.goto(base + "/login", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Continue with email" }).waitFor();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${directory}/signin-${width}.png`,
      fullPage: true,
    });
    assert.equal(await page.locator('input[type="password"]').count(), 0);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await page.getByLabel("Email address").fill("qa@example.invalid");
    assert.ok(
      await page
        .getByRole("button", { name: "Email my sign-in link" })
        .isVisible(),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const axe = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      axe.violations
        .filter((v) => ["critical", "serious"].includes(v.impact || ""))
        .map((v) => v.id),
      [],
    );
    assert.deepEqual(errors, []);
    await context.close();
  }
  const seeded = await query(
    "INSERT INTO director.users(id,email,name,email_verified_at,canonical_owner_id,account_class) VALUES($1,$2,'QA Founder role fixture',now(),$1,'founder') ON CONFLICT(id) DO NOTHING RETURNING id",
    [FOUNDER_OWNER, prefix + "@example.invalid"],
  );
  createdFounder = seeded.length > 0;
  const founderCookie = await session(FOUNDER_OWNER);
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    await context.addCookies([founderCookie]);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/founder", { waitUntil: "domcontentloaded" });
    await page
      .getByText("Registered accounts", { exact: true })
      .waitFor({ timeout: 30000 });
    for (const name of [
      "Overview",
      "Accounts",
      "Activity",
      "Reviews",
      "Enquiries",
      "Payments",
      "AI Costs",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      await page
        .getByText("Loading the live figures…", { exact: true })
        .waitFor({ state: "hidden", timeout: 30000 });
      await page
        .getByText("Loading contributions…", { exact: true })
        .waitFor({ state: "hidden", timeout: 30000 });
      await page.waitForTimeout(500);
      assert.equal(
        await page
          .getByRole("alert")
          .filter({ hasText: /couldn’t|failed|unavailable/i })
          .count(),
        0,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${name} overflow at ${width}`,
      );
      if (["Overview", "Accounts", "AI Costs"].includes(name))
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `${directory}/founder-${name.toLowerCase().replaceAll(" ", "-")}-${width}.png`,
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  await query(
    "INSERT INTO director.users(id,email,name,email_verified_at,canonical_owner_id,account_class) VALUES($1,$2,'QA ordinary user',now(),$1,'test')",
    [prefix, prefix + "-user@example.invalid"],
  );
  const context = await browser.newContext();
  await context.addCookies([await session(prefix)]);
  const ordinary = await context.request.get(base + "/api/founder");
  assert.equal(ordinary.status(), 403);
  const page = await context.newPage();
  await page.goto(base + "/founder");
  await page
    .getByText("This dashboard is restricted to the Founder account.")
    .waitFor();
  assert.equal(
    await page.getByText("Registered accounts", { exact: true }).count(),
    0,
  );
  await context.close();
  const fresh = await browser.newContext();
  assert.equal((await fresh.request.get(base + "/api/founder")).status(), 401);
  await fresh.close();
  console.log(
    "Desktop/mobile sign-in layout, seven DB-backed Founder sections, overflow, page errors and standard-user/fresh-session isolation passed. OAuth buttons were visual fixtures; real provider sign-in remains a release gate.",
  );
} finally {
  await browser.close();
  await query(
    "DELETE FROM director.access_sessions WHERE token_hash=ANY($1::text[])",
    [tokens],
  );
  await query("DELETE FROM director.users WHERE id=$1", [prefix]);
  if (createdFounder)
    await query(
      "DELETE FROM director.users u WHERE id=$1 AND email=$2 AND NOT EXISTS(SELECT 1 FROM director.users a WHERE a.canonical_owner_id=$1 AND a.id<>$1) AND NOT EXISTS(SELECT 1 FROM director.reports WHERE owner_id=$1) AND NOT EXISTS(SELECT 1 FROM director.auth_principals WHERE owner_id=$1)",
      [FOUNDER_OWNER, prefix + "@example.invalid"],
    );
  await database().end();
}
