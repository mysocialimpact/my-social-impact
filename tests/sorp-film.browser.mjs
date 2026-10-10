import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const origin = process.env.TEST_ORIGIN || "http://localhost:3010";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw Error("Local preview origin required");
await mkdir("outputs/sorp-film", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/animation`);
    await page.getByRole("button", { name: "Next →", exact: true }).waitFor();
    await page.locator('.sorp-film[data-ready="true"]').waitFor();
    for (const [index, time] of [
      1, 3, 6, 10.5, 15, 20, 23.5, 26.5, 29,
    ].entries()) {
      await page
        .locator(".sorp-film")
        .evaluate(
          (element, time) =>
            element.dispatchEvent(
              new CustomEvent("sorp-film:seek", { detail: time }),
            ),
          time,
        );
      await page.waitForFunction(
        (time) =>
          document.querySelector(".sorp-film")?.getAttribute("data-time") ===
          time.toFixed(3),
        time,
      );
      assert.equal(
        await page.locator(".sorp-film").getAttribute("data-scene"),
        String(index),
      );
      const layout = await page.evaluate(() => {
        const stage = document
          .querySelector(".sf-stage")
          .getBoundingClientRect();
        const caption = document
          .querySelector(".sf-footer")
          .getBoundingClientRect();
        const children = [...document.querySelector(".sf-scene").children].map(
          (element) => element.getBoundingClientRect(),
        );
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          clipped: children.some(
            (box) =>
              box.bottom > caption.top ||
              box.right > stage.right ||
              box.left < stage.left,
          ),
        };
      });
      assert.deepEqual(
        layout,
        { overflow: false, clipped: false },
        `${width}px scene ${index}`,
      );
      await page.locator(".sf-stage").screenshot({
        path: `outputs/sorp-film/storyboard-${width}-${index}.png`,
      });
    }
    assert.deepEqual(errors, []);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.getByText("Slide 1 of 9", { exact: true }).waitFor();
    await page.locator('.sorp-film[data-reduced-motion="true"]').waitFor();
    assert.equal(
      await page.locator(".sorp-film").getAttribute("data-reduced-motion"),
      "true",
    );
    await page
      .getByRole("button", {
        name: "4. Then · Historical Snapshot",
        exact: true,
      })
      .click();
    assert.equal(
      await page.locator(".sorp-film").getAttribute("data-scene"),
      "3",
    );
    await page.close();
  }
  const page = await browser.newPage();
  await page.goto(`${origin}/animation`);
  await page.locator('.sorp-film[data-ready="true"]').waitFor();
  const previous = page.getByRole("button", {
    name: "← Previous",
    exact: true,
  });
  const next = page.getByRole("button", { name: "Next →", exact: true });
  assert.equal(await previous.isDisabled(), true);
  assert.equal(
    await page.locator(".sorp-film").getAttribute("data-slide"),
    "0",
  );
  await next.click();
  assert.equal(
    await page
      .locator(".sf-line path")
      .evaluate((el) => el.getAnimations().length > 0),
    true,
  );
  assert.equal(
    await page.locator(".sorp-film").getAttribute("data-slide"),
    "1",
  );
  await page.waitForTimeout(2000);
  assert.equal(
    await page.locator(".sorp-film").getAttribute("data-slide"),
    "1",
  );
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator(".sorp-film").getAttribute("data-slide"),
    "2",
  );
  await page.keyboard.press("ArrowLeft");
  assert.equal(
    await page.locator(".sorp-film").getAttribute("data-slide"),
    "1",
  );
  await page
    .getByRole("button", { name: "9. Start free", exact: true })
    .click();
  assert.equal(await next.isDisabled(), true);
  const cta = page.getByRole("link", { name: "START THE FREE REVIEW", exact: true });
  await cta.waitFor();
  assert.equal(
    await cta.getAttribute("href"),
    "/are-you-sorp-ready/review?entry=intro",
  );
  assert.equal(await page.locator(".sf-chapters button").count(), 9);
  assert.equal(await page.locator(".sf-line path").count(), 1);
  await page.keyboard.press("Tab");
  await cta.focus();
  assert.equal(
    await cta.evaluate((el) => getComputedStyle(el).outlineStyle),
    "solid",
  );
  const capture = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  await capture.goto(`${origin}/animation?capture=1&time=29`);
  await capture.locator('.sorp-film[data-ready="true"]').waitFor();
  await capture.evaluate(() => document.fonts.ready);
  await capture
    .locator(".sf-portrait")
    .evaluateAll((images) =>
      Promise.all(images.map((image) => image.decode())),
    );
  assert.equal(await capture.locator(".sf-controls").count(), 0);
  assert.equal(
    await capture.locator(".sorp-film").getAttribute("data-slide"),
    "8",
  );
  const first = await capture.locator(".sf-stage").screenshot();
  await capture.waitForTimeout(300);
  assert.deepEqual(
    await capture.locator(".sf-stage").screenshot(),
    first,
    "Fixed capture must be deterministic",
  );
  await capture.close();
  console.log(
    "PASS: 27 storyboard layouts; reduced motion; manual slide navigation and keyboard controls.",
  );
} finally {
  await browser.close();
}
