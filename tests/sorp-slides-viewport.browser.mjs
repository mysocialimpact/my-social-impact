import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const origin = process.env.TEST_ORIGIN || "http://localhost:3010";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw Error("Local preview origin required");
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
await mkdir("outputs/sorp-slides", { recursive: true });
try {
  for (const [width, height] of [
    [1518, 856],
    [1280, 720],
    [768, 1024],
    [490, 850],
    [390, 664],
    [375, 812],
    [320, 568],
    [844, 390],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(origin + "/animation");
    await page.locator('.sorp-film[data-ready="true"]').waitFor();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator('.sorp-film[data-reduced-motion="true"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (let slide = 0; slide < 9; slide++) {
      if (slide)
        await page.getByRole("button", { name: "Next →", exact: true }).click();
      await page.waitForFunction(
        (s) => document.querySelector(".sorp-film").dataset.slide === String(s),
        slide,
      );
      await page
        .locator(".sf-portrait")
        .evaluateAll((images) =>
          Promise.all(images.map((image) => image.decode())),
        );
      const errors = await page.evaluate(() => {
        const issues = [];
        const stage = document
          .querySelector(".sf-stage")
          .getBoundingClientRect();
        for (const el of document.querySelectorAll(
          ".sf-scene > *, .sf-controls, .sf-chapters",
        )) {
          const r = el.getBoundingClientRect();
          if (
            r.bottom > innerHeight + 1 ||
            r.right > innerWidth + 1 ||
            r.left < 0 ||
            r.top < 0
          )
            issues.push(`Outside viewport: ${el.className}`);
          if (
            el.parentElement.matches(".sf-scene") &&
            r.bottom > stage.bottom - 20
          )
            issues.push(`Outside stage: ${el.className}`);
        }
        const footer = document
          .querySelector(".sf-footer")
          .getBoundingClientRect();
        for (const el of document.querySelectorAll(".sf-scene *")) {
          const r = el.getBoundingClientRect();
          if (
            r.width &&
            r.height &&
            (r.bottom > footer.top ||
              r.right > stage.right ||
              r.left < stage.left)
          )
            issues.push(
              `Content outside composition: ${el.className || el.tagName}`,
            );
        }
        if (
          document.documentElement.scrollHeight > innerHeight ||
          document.documentElement.scrollWidth > innerWidth
        )
          issues.push("Document scrolls");
        return issues;
      });
      assert.deepEqual(errors, [], `${width}x${height}, slide ${slide + 1}`);
      await page.screenshot({
        path: `outputs/sorp-slides/${width}-${height}-${slide}.png`,
      });
    }
    await page.close();
  }
  console.log(
    "PASS: all 9 slides fit 8 desktop, tablet, phone and landscape viewports.",
  );
} finally {
  await browser.close();
}
