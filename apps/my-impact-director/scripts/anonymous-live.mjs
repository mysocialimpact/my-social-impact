import { chromium, request } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const mode = process.argv[3] || "upload";
const infoPath = "/workspace/mid-anonymous-review.json",
  statePath = "/workspace/mid-anonymous-state.json";
const proxy = process.env.HTTPS_PROXY
  ? { proxy: { server: process.env.HTTPS_PROXY } }
  : {};
await mkdir("artifacts/live", { recursive: true });
if (mode === "upload") {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
    ...proxy,
  });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await ctx.newPage();
    const share = new URL(config.url);
    if (config.bypass) share.searchParams.set("_vercel_share", config.bypass);
    await page.goto(share.href, { waitUntil: "networkidle" });
    assert.equal(
      await page.locator('input[type="email"],input[type="password"]').count(),
      0,
    );
    await page
      .getByLabel("Choose a PDF report")
      .setInputFiles("artifacts/real-reports/small-charity-support-2024.pdf");
    await page.getByRole("checkbox", { name: /I have permission/ }).check();
    await page
      .getByRole("button", { name: "Review my report — free", exact: true })
      .click();
    await page.waitForURL(/\/reviews\/[0-9a-f-]{36}$/, { timeout: 60000 });
    const id = new URL(page.url()).pathname.split("/").at(-1);
    const account = await (
      await ctx.request.get(config.url + "/api/account")
    ).json();
    assert.equal(account.user.anonymous, true);
    assert.equal(account.user.email, "");
    await ctx.storageState({ path: statePath });
    await writeFile(
      infoPath,
      JSON.stringify({
        id,
        url: config.url,
        source:
          "https://www.smallcharitysupport.uk/images/DownLoads/AU-AboutUs/2024-TAR%26FS.pdf",
      }),
      { mode: 0o600 },
    );
    await page.screenshot({
      path: "artifacts/live/anonymous-upload-mobile.png",
      fullPage: true,
    });
    console.log(
      JSON.stringify({
        step: "anonymous_upload",
        id,
        anonymous: true,
        noEmail: true,
      }),
    );
  } finally {
    await browser.close();
  }
} else {
  const { id } = JSON.parse(await readFile(infoPath, "utf8"));
  const ctx = await request.newContext({
    baseURL: config.url,
    storageState: statePath,
    ...proxy,
  });
  try {
    if (mode === "worker") {
      const r = await ctx.get("/api/worker?review=" + id, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
        timeout: 310000,
      });
      console.log(JSON.stringify({ worker: r.status() }));
    }
    const r = await ctx.get("/api/reviews/" + id);
    assert.equal(r.status(), 200);
    const review = await r.json();
    console.log(
      JSON.stringify({
        id,
        status: review.status,
        stage: review.stage,
        cursor: review.visual_cursor,
        attempts: review.attempts,
        error: review.error_code,
        cost: review.cost_usd,
      }),
    );
    if (review.status === "complete")
      await writeFile(
        "artifacts/live/genuine-anonymous-review.json",
        JSON.stringify(review, null, 2),
      );
  } finally {
    await ctx.dispose();
  }
}
