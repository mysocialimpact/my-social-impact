import { chromium, request } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const mode = process.argv[3] || "upload",
  infoPath = "/workspace/mid-live-review.json";
const proxy = process.env.HTTPS_PROXY
  ? { proxy: { server: process.env.HTTPS_PROXY } }
  : {};
await mkdir("artifacts/live", { recursive: true });
if (mode === "upload") {
  const browser = await chromium.launch({
    executablePath: process.env.QA_BROWSER || undefined,
    args: ["--no-sandbox"],
    ...proxy,
  });
  try {
    const context = await browser.newContext({
        storageState: "/workspace/mid-live-qa-state.json",
        viewport: { width: 390, height: 844 },
      }),
      page = await context.newPage();
    await page.goto(config.url + "/review", { waitUntil: "networkidle" });
    await page
      .getByLabel("Choose a PDF report")
      .setInputFiles("artifacts/real-reports/small-charity-support-2024.pdf");
    await page.getByRole("checkbox", { name: /I have permission/ }).check();
    await page.getByRole("checkbox", { name: /Optional: allow/ }).check();
    await page
      .getByRole("button", { name: "Confirm report & start my free review" })
      .click();
    await page.waitForURL(/\/reviews\/[0-9a-f-]{36}$/, { timeout: 60000 });
    const id = new URL(page.url()).pathname.split("/").at(-1);
    await writeFile(
      infoPath,
      JSON.stringify({
        id,
        source:
          "https://www.smallcharitysupport.uk/images/DownLoads/AU-AboutUs/2024-TAR%26FS.pdf",
      }),
    );
    await page.screenshot({
      path: "artifacts/live/upload-processing-mobile.png",
      fullPage: true,
    });
    console.log(JSON.stringify({ step: "real_pdf_upload", id, ok: true }));
  } finally {
    await browser.close();
  }
} else {
  const { id } = JSON.parse(await readFile(infoPath, "utf8"));
  const ctx = await request.newContext({
    baseURL: config.url,
    storageState: "/workspace/mid-live-qa-state.json",
    ...proxy,
  });
  try {
    if (mode === "worker") {
      const r = await ctx.get("/api/worker", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
        timeout: 310000,
      });
      console.log({ workerStatus: r.status(), body: await r.json() });
    }
    const r = await ctx.get("/api/reviews/" + id);
    assert.equal(r.status(), 200);
    const review = await r.json();
    console.log(
      JSON.stringify({
        id,
        status: review.status,
        stage: review.stage,
        visualCursor: review.visual_cursor,
        error: review.error_code,
        message: review.error_message,
        cost: review.cost_usd,
      }),
    );
    if (review.status === "complete")
      await writeFile(
        "artifacts/live/genuine-review.json",
        JSON.stringify(review, null, 2),
      );
  } finally {
    await ctx.dispose();
  }
}
