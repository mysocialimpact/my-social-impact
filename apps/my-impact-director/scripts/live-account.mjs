import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const accountPath = "/workspace/mid-live-qa-account.json";
let account = await readFile(accountPath, "utf8")
  .then(JSON.parse)
  .catch(() => null);
const signup = !account;
if (!account) {
  account = {
    name: "My Impact Director QA - no contact",
    email: `mid-qa-${randomBytes(6).toString("hex")}@example.invalid`,
    password: randomBytes(22).toString("base64url"),
  };
  await writeFile(accountPath, JSON.stringify(account), { mode: 0o600 });
}
const browser = await chromium.launch({
  executablePath: process.env.QA_BROWSER || undefined,
  args: ["--no-sandbox"],
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  const share = new URL(config.url);
  share.searchParams.set("_vercel_share", config.bypass);
  await page.goto(share.href, { waitUntil: "networkidle" });
  await page.goto(config.url + "/review", { waitUntil: "networkidle" });
  if (signup)
    await page.getByLabel("Your name", { exact: true }).fill(account.name);
  else
    await page
      .getByRole("button", { name: "Sign in", exact: true })
      .first()
      .click();
  await page.getByLabel("Email address", { exact: true }).fill(account.email);
  await page.getByLabel(/^Password/).fill(account.password);
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/account") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", {
      name: signup ? "Create my free account" : "Sign in",
      exact: true,
    })
    .last()
    .click();
  const r = await response;
  console.log(
    JSON.stringify({
      step: signup ? "real_registration" : "real_login",
      status: r.status(),
    }),
  );
  assert.ok(r.ok());
  await page.getByLabel("Choose a PDF report").waitFor({ timeout: 30000 });
  const who = await context.request.get(config.url + "/api/account");
  const data = await who.json();
  assert.equal(data.user.email, account.email);
  assert.equal(data.user.founder, false);
  account.id = data.user.id;
  account.registered = true;
  await writeFile(accountPath, JSON.stringify(account), { mode: 0o600 });
  const admin = await context.request.get(config.url + "/api/admin");
  assert.equal(admin.status(), 403);
  await mkdir("artifacts/live", { recursive: true });
  await page.screenshot({
    path: "artifacts/live/signed-in-intake.png",
    fullPage: true,
  });
  await context.storageState({ path: "/workspace/mid-live-qa-state.json" });
  console.log(
    JSON.stringify({ step: "server_identity_and_founder_denial", ok: true }),
  );
} finally {
  await browser.close();
}
