import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_ORIGIN || "http://localhost:3010";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw Error("Local preview origin required");
await mkdir("outputs/sorp-sales", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const width of [1440, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/are-you-sorp-ready");
    const deck = page.locator(".sorp-film");
    await page.locator('.sorp-film[data-ready="true"][data-reduced-motion="true"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("h1").count(), 1, "One page-level heading");
    assert.equal(await deck.locator(".sf-chapters button").count(), 9);
    assert.equal(await page.locator(".sr-details > details").count(), 8);
    assert.equal(await page.locator(".sr-details > details[open]").count(), 0);
    assert.ok((await deck.boundingBox()).y < 500, "Presentation starts near the top");
    await page.locator(".sr-hero a").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await deck.getAttribute("data-slide"), "0", "Outside keyboard focus must not navigate the deck");
    await deck.focus();
    await page.keyboard.press("ArrowRight");
    await page.locator('.sorp-film[data-slide="1"]').waitFor();
    await page.keyboard.press("ArrowLeft");
    await page.locator('.sorp-film[data-slide="0"]').waitFor();
    for (let slide = 0; slide < 9; slide++) {
      await deck.locator(".sf-chapters button").nth(slide).click();
      await page.waitForFunction(s => document.querySelector(".sorp-film").dataset.slide === String(s), slide);
      await deck.locator("img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
      const clipping = await page.evaluate(() => {
        const stage = document.querySelector(".sf-stage").getBoundingClientRect();
        const footer = document.querySelector(".sf-footer").getBoundingClientRect();
        return [...document.querySelectorAll(".sf-scene *")].filter(el => {
          const r = el.getBoundingClientRect();
          return r.width && r.height && (r.bottom > footer.top || r.right > stage.right + 1 || r.left < stage.left - 1);
        }).map(el => el.className || el.tagName);
      });
      assert.deepEqual(clipping, [], width + "px embedded slide " + (slide + 1));
      assert.equal(await deck.locator(".sf-line path").count(), 1);
      assert.equal(await deck.evaluate(el => el.getAnimations({ subtree: true }).length), 0);
      await deck.screenshot({ path: "outputs/sorp-sales/" + width + "-slide-" + (slide + 1) + ".png" });
    }
    await deck.locator(".sf-chapters button").first().click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: "outputs/sorp-sales/" + width + "-landing.png", fullPage: true });
    for (const summary of await page.locator(".sr-details > details > summary").all()) {
      await summary.click();
      assert.equal(await summary.evaluate(el => el.parentElement.open), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await summary.click();
    }
    await deck.locator(".sf-chapters button").last().click();
    const cta = deck.getByRole("link", { name: "START THE FREE REVIEW" });
    assert.equal(await cta.getAttribute("href"), "/are-you-sorp-ready/review?entry=intro");
    assert.deepEqual(errors, [], "Sales page has no runtime errors");
    await cta.click();
    await page.waitForURL(/\/are-you-sorp-ready\/review/);
    await page.locator(".si-welcome").waitFor();
    assert.equal(await page.getByRole("heading", { name: "ARE YOU SORP READY?", exact: true }).count(), 1);
    // The existing review imports Stripe; restricted local environments may block
    // that external script. This check ends at the unchanged review welcome.
    assert.deepEqual(errors.filter(error => error !== "Failed to load Stripe.js"), []);
    if (errors.length) console.log("Review welcome reached; external Stripe.js unavailable in local environment.");
    await page.close();
  }
  console.log("PASS: embedded deck across four widths; all nine slides; focus-scoped keyboard; reduced motion; eight expanders; CTA reaches existing review.");
} finally {
  await browser.close();
}
