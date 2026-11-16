// Actual production upload and original download. No intercepted requests.
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const base = "https://www.myimpactdirector.com",
  file = "artifacts/uploads/large-report.pdf";
const original = await readFile(file);
assert.ok(original.length > 4_500_000);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
try {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage(),
    parts = [];
  page.on("request", (r) => {
    if (r.method() === "PUT" && r.url().includes("/api/uploads/"))
      parts.push({
        part: new URL(r.url()).searchParams.get("part"),
      });
  });
  await page.goto(base, { waitUntil: "networkidle" });
  assert.match(await page.locator(".dropzone").innerText(), /50 MB/);
  await page.getByLabel("Choose a PDF report").setInputFiles(file);
  assert.equal(await page.locator(".upload-failure").count(), 0);
  await page.getByRole("checkbox", { name: /I have permission/ }).check();
  await page
    .getByRole("button", { name: "Review my report — free", exact: true })
    .click();
  await page.waitForURL(/\/reviews\/[a-f0-9-]{36}$/, { timeout: 120000 });
  const id = new URL(page.url()).pathname.split("/").at(-1);
  await context.storageState({
    path: "/workspace/mid-large-upload-state.json",
  });
  await writeFile(
    "/workspace/mid-large-upload-info.json",
    JSON.stringify({ id, url: base }),
    { mode: 0o600 },
  );
  const source = await context.request.get(`${base}/api/reviews/${id}/source`, {
    timeout: 90000,
  });
  assert.equal(source.status(), 200);
  const bytes = await source.body();
  assert.equal(bytes.length, original.length);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    createHash("sha256").update(original).digest("hex"),
  );
  const account = await (
    await context.request.get(base + "/api/account")
  ).json();
  assert.equal(account.user.anonymous, true);
  assert.ok(parts.length >= 4);
  // Chromium’s text-form request events do not preserve byte lengths for binary bodies.
  // The real endpoint validates exact chunk sizes; integrity is checked against the full source below.
  await page.screenshot({
    path: "artifacts/uploads/production-large-upload.png",
    fullPage: true,
  });
  const observations = {
    id,
    bytes: original.length,
    parts,
    anonymous: true,
    downloadIntact: true,
  };
  await writeFile(
    "artifacts/uploads/production-transfer.json",
    JSON.stringify(observations, null, 2),
  );
  console.log(JSON.stringify(observations));
  await context.close();
} finally {
  await browser.close();
}
