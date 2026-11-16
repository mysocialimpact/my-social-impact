// Browser transport contract: intercepted responses; no deployed records or AI calls.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const base = process.argv[2] || "http://localhost:3003";
const file = await readFile("artifacts/uploads/large-report.pdf");
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const width of [1366, 390]) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
      }),
      page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.locator("input[type=file]").setInputFiles({
      name: "too-large.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(50_000_001),
    });
    await page.locator(".upload-failure").waitFor();
    assert.match(
      await page.locator(".upload-failure").innerText(),
      /really sorry/,
    );
    assert.match(await page.locator(".upload-failure").innerText(), /50 MB/);
    await page.locator(".upload-failure a").click();
    await page.waitForURL(/feedback/);
    assert.match(
      await page
        .getByRole("textbox", { name: /What would make it better/ })
        .inputValue(),
      /couldn’t upload/,
    );
    await page.goto(base, { waitUntil: "networkidle" });
    let failed = false,
      parts = [],
      finishes = 0,
      initialisations = 0;
    await context.route("**/api/visitor", (r) =>
      r.fulfill({ json: { ok: true } }),
    );
    await context.route("**/api/uploads", (r) => {
      initialisations++;
      return r.fulfill({
        status: 201,
        json: {
          id: "00000000-0000-4000-8000-000000000001",
          chunkSize: 3_000_000,
        },
      });
    });
    await context.route("**/api/uploads/*", (r) => {
      if (r.request().method() === "POST") {
        finishes++;
        return r.fulfill({
          status: 503,
          json: { error: "Synthetic completion failure for retry check" },
        });
      }
      const part = Number(new URL(r.request().url()).searchParams.get("part"));
      parts.push(part);
      assert.ok(r.request().postDataBuffer().length <= 3_000_000);
      if (part === 1 && !failed) {
        failed = true;
        return r.fulfill({
          status: 503,
          json: { error: "Synthetic interrupted transfer" },
        });
      }
      return r.fulfill({ json: { ok: true } });
    });
    await page.locator("input[type=file]").setInputFiles({
      name: "large-report.pdf",
      mimeType: "application/pdf",
      buffer: file,
    });
    await page.getByRole("checkbox", { name: /I have permission/ }).check();
    await page
      .getByRole("button", { name: "Review my report — free", exact: true })
      .click();
    await page.locator(".upload-failure").waitFor();
    assert.deepEqual(parts, [0, 1]);
    assert.equal(
      await page
        .getByRole("checkbox", { name: /I have permission/ })
        .isChecked(),
      true,
    );
    await page
      .getByRole("button", { name: "Review my report — free", exact: true })
      .click();
    await page
      .locator(".upload-failure", { hasText: "completion failure" })
      .waitFor();
    assert.equal(parts.filter((p) => p === 0).length, 1);
    assert.equal(parts.filter((p) => p === 1).length, 2);
    assert.equal(initialisations, 1);
    assert.equal(finishes, 1);
    await page.screenshot({
      path: `artifacts/uploads/${width}-helpful-failure.png`,
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await context.close();
  }
  console.log(
    JSON.stringify({
      checks: [
        "50 MB rejection is apologetic and links working feedback",
        "Feedback has upload context",
        "12 MB file is accepted",
        "Every transfer request stays under 3 MB",
        "Retry keeps successful parts and consent",
        "Mobile and desktop fit",
      ],
      mode: "mocked browser transport contract",
    }),
  );
} finally {
  await browser.close();
}
