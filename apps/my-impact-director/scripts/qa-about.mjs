import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.env.QA_BASE_URL || "http://localhost:3013";
const dir = process.env.QA_SCREENSHOTS || "artifacts/about";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.QA_BROWSER,
  args: ["--no-sandbox"],
  ...(!base.includes("localhost") && process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
try {
  for (const width of [320, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width < 500 ? 844 : 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage(),
      nav = page.getByRole("navigation", { name: "Main navigation" });
    async function openNav() {
      if (
        await page
          .getByRole("button", { name: "Menu", exact: false })
          .isVisible()
      )
        await page.getByRole("button", { name: "Menu" }).click();
    }
    await page.goto(base + "/about");
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".founder-photo img").last().scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".founder-photo img")].every(
        (i) => i.complete && i.naturalWidth,
      ),
    );
    assert.equal(await page.locator(".founder-photo img").count(), 2);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: path.join(dir, "about-" + width + ".png") });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    if (width === 390 || width === 1440) {
      const axe = await new AxeBuilder({ page })
        .include(".about-page")
        .include(".site-header")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        axe.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        [],
      );
    }
    await openNav();
    if (width <= 980) {
      assert.equal(
        await nav
          .getByRole("link", { name: "Home", exact: true })
          .evaluate((e) => e === document.activeElement),
        true,
      );
      await page.keyboard.press("Escape");
      assert.equal(await nav.isVisible(), false);
      await page.keyboard.press("Enter");
      await nav.waitFor();
    }
    for (const [name, href] of [
      ["Home", "/"],
      ["About", "/about"],
      ["Contact", "/about#contact"],
      ["My Reports", "/reviews"],
      ["Sign in", "/login"],
    ]) {
      assert.equal(
        await nav.getByRole("link", { name, exact: true }).getAttribute("href"),
        href,
      );
    }
    await nav.getByRole("link", { name: "Contact", exact: true }).click();
    await page.waitForURL("**/about#contact");
    await page.waitForFunction(() => {
      const y = document.querySelector("#contact").getBoundingClientRect().top,
        h = document
          .querySelector(".site-header")
          .getBoundingClientRect().bottom;
      return y >= h - 2 && y < h + 220;
    });
    await page.screenshot({
      path: path.join(dir, "contact-" + width + ".png"),
    });
    await openNav();
    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await page.waitForURL(base + "/");
    await openNav();
    await nav.getByRole("link", { name: "About", exact: true }).click();
    await page
      .getByRole("heading", { name: /Behind the intelligence/ })
      .waitFor();
    await page.goto(base + "/contact?service=improvement");
    await page.waitForURL("**/about?service=improvement#contact");
    assert.equal(
      await page.locator("#contact select").inputValue(),
      "improvement",
    );
    assert.equal(await page.locator("#contact form").count(), 1);
    for (const address of ["marcus", "chris"]) {
      const href = await page
        .locator("#contact address a")
        .filter({ hasText: address + "@" })
        .getAttribute("href");
      assert.equal(new URL(href).pathname, address + "@mysocialimpact.org");
      assert.match(new URL(href).searchParams.get("subject"), /Improve/);
    }
    assert.equal(
      await page.locator(".signature-footer a[href='/about#contact']").count(),
      1,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
