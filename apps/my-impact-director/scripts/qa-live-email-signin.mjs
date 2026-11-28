import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import assert from "node:assert/strict";
const path = process.argv[2];
if (!path) throw new Error("Supply a private QA configuration path.");
const config = JSON.parse(await readFile(path, "utf8")),
  step = process.argv[3] || "request",
  state =
    config.statePath || "artifacts/signin-founder/private-email-state.json";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
await mkdir("artifacts/signin-founder", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...(step === "redeem" ? { storageState: state } : {}),
  });
  const page = await context.newPage();
  if (step === "request") {
    const url = new URL("/login?next=/founder", config.url);
    url.searchParams.set("_vercel_share", config.bypass);
    await page.goto(url.href, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Continue with email", exact: true })
      .waitFor({ timeout: 30000 });
    await page
      .getByRole("button", { name: "Continue with email", exact: true })
      .click();
    await page.getByLabel("Email address").fill(config.recipient);
    await page
      .getByRole("button", { name: "Email my sign-in link", exact: false })
      .click();
    await page
      .getByRole("heading", { name: "Check your inbox." })
      .waitFor({ timeout: 30000 });
    await context.storageState({ path: state });
    await chmod(state, 0o600);
    await page.screenshot({
      path: "artifacts/signin-founder/real-email-request.png",
      fullPage: true,
    });
    console.log(
      "Real passwordless sign-in email accepted for the approved Founder address. No token or credential logged.",
    );
  } else {
    if (step === "redeem-fresh") {
      const bootstrap = new URL("/login", config.url);
      bootstrap.searchParams.set("_vercel_share", config.bypass);
      await page.goto(bootstrap.href, { waitUntil: "domcontentloaded" });
      await page
        .getByRole("button", { name: "Continue with email", exact: true })
        .waitFor({ timeout: 30000 });
      assert.equal(
        (await context.cookies()).some((c) =>
          ["mid_saved", "mid_access", "msi_sorp_session"].includes(c.name),
        ),
        false,
        "a second device begins with no application session",
      );
    }
    assert.ok(
      config.emailLink,
      "Expected a securely captured actual email link.",
    );
    await page.goto(config.emailLink, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Confirm email & open review" })
      .click();
    await page
      .getByRole("heading", { name: "The whole picture." })
      .waitFor({ timeout: 30000 });
    const result = await context.request.get(config.url + "/api/account"),
      account = await result.json();
    assert.equal(result.status(), 200);
    assert.equal(account.user.email, config.recipient);
    assert.equal(account.user.emailVerified, true);
    assert.equal(account.user.founder, true);
    assert.equal(account.user.id, "founder_marcus_warry");
    const overview = await context.request.get(config.url + "/api/founder");
    assert.equal(overview.status(), 200);
    assert.ok((await overview.json()).data.metrics);
    await page
      .getByText("Loading the live figures…", { exact: true })
      .waitFor({ state: "hidden", timeout: 30000 });
    await page.screenshot({
      path: "artifacts/signin-founder/real-founder-email-signin.png",
      fullPage: true,
    });
    const replay = await context.request.post(config.url + "/api/save", {
      headers: { origin: config.url },
      data: {
        action: "redeem",
        token: new URL(config.emailLink).hash.slice(1),
      },
    });
    assert.equal(replay.status(), 410);
    const logout = await context.request.post(config.url + "/api/account", {
      headers: { origin: config.url },
      data: { action: "logout" },
    });
    assert.equal(logout.status(), 200);
    const after = await context.request.get(config.url + "/api/account");
    assert.equal((await after.json()).user, null);
    console.log(
      "Actual email received and redeemed: verified Founder account restored; private dashboard 200; replay rejected 410; logout removed access. Google/Apple remain unconfigured.",
    );
  }
  await context.close();
} catch (e) {
  const message = String(e?.message || e);
  console.error(
    message
      .replaceAll(config.bypass, "[private]")
      .replaceAll(config.emailLink || "__none__", "[private email link]")
      .replace(/#[A-Za-z0-9_-]{43}/g, "#[private]"),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
