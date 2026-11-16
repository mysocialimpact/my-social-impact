import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:3012",
  live = base.startsWith("https");
await fs.mkdir("artifacts/identity", { recursive: true });
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(live ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
});
try {
  for (const [width, height] of live || process.env.QA_SMOKE
    ? [
        [1366, 768],
        [390, 844],
      ]
    : [
        [1440, 900],
        [1366, 768],
        [1280, 720],
        [390, 844],
        [320, 750],
        [640, 400],
      ]) {
    const c = await b.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
      }),
      p = await c.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    if (!live) {
      await c.route("**/api/account", (r) =>
        r.fulfill({ json: { user: null } }),
      );
      await c.route("**/api/save", (r) =>
        r.fulfill({ json: { emailEnabled: true } }),
      );
    }
    const checkGeometry = async () => {
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `overflow ${width} ${p.url()}`,
      );
      const h = await p.locator("header.site-header").boundingBox(),
        n = await p.locator(".section-navigation").boundingBox();
      assert.ok(h.x >= 0 && h.x + h.width <= width + 1);
      if (n)
        assert.ok(
          Math.abs(n.y - (h.y + h.height)) <= 1,
          `bars overlap ${JSON.stringify({ h, n })}`,
        );
    };
    for (const path of [
      "/",
      "/methodology",
      "/methodology/impact-report-excellence",
      "/your-impact-director",
    ]) {
      await p.goto(base + path, { waitUntil: "networkidle" });
      await checkGeometry();
      assert.equal(
        await p
          .locator("header")
          .getByRole("link", { name: "LOGIN", exact: true })
          .isVisible(),
        true,
      );
      const current = path.startsWith("/methodology")
        ? "Methodology"
        : path === "/your-impact-director"
          ? "Your Impact Director"
          : "Home";
      if (width > 1280)
        assert.equal(
          await p.locator("#main-nav a[aria-current=page]").innerText(),
          current,
        );
      else {
        await p.locator(".menu-toggle[aria-expanded=false]").click();
        assert.equal(
          await p.locator("#main-nav a[aria-current=page]").innerText(),
          current,
        );
        await p.locator(".menu-toggle[aria-expanded=true]").click();
      }
      const sections = await p
        .locator(".section-navigation a")
        .evaluateAll((links) =>
          links.map((a) => ({ id: a.hash.slice(1), label: a.textContent })),
        );
      for (const { id } of sections) {
        await p.locator('.section-navigation a[href="#' + id + '"]').click();
        await p
          .waitForFunction(
            (id) =>
              document
                .querySelector(".section-navigation a[aria-current=location]")
                ?.getAttribute("href") ===
              "#" + id,
            id,
            { timeout: 5000 },
          )
          .catch(async (e) => {
            throw Error(
              `${width} ${path} #${id}: active ${await p.locator(".section-navigation a[aria-current=location]").getAttribute("href")}`,
            );
          });
        const y = await p
            .locator('[id="' + id + '"]')
            .evaluate((el) => el.getBoundingClientRect().top),
          bottom = await p
            .locator(".section-navigation")
            .evaluate((el) => el.getBoundingClientRect().bottom);
        assert.ok(
          y >= bottom - 2,
          `hidden anchor ${path}#${id} ${width}: ${y}<${bottom}`,
        );
      }
      // Native scrolling must update the active section independently of click state.
      for (const { id } of sections.slice().reverse()) {
        await p
          .locator('[id="' + id + '"]')
          .evaluate((el) =>
            el.scrollIntoView({ behavior: "instant", block: "start" }),
          );
        await p
          .waitForFunction(
            (id) =>
              document
                .querySelector(".section-navigation a[aria-current=location]")
                ?.getAttribute("href") ===
              "#" + id,
            id,
            { timeout: 5000 },
          )
          .catch(async (e) => {
            throw Error(
              `${width} ${path} #${id}: active ${await p.locator(".section-navigation a[aria-current=location]").getAttribute("href")}`,
            );
          });
      }
      await checkGeometry();
      await p.screenshot({
        path: `artifacts/identity/${path === "/" ? "home" : path.replaceAll("/", "-")}-${width}.png`,
        fullPage: true,
      });
      if ([1366, 390].includes(width)) {
        const a = await new AxeBuilder({ page: p }).analyze();
        if (a.violations.length)
          console.log(
            JSON.stringify(
              a.violations.map((v) => ({
                id: v.id,
                nodes: v.nodes.map((n) => n.html),
              })),
            ),
          );
        assert.deepEqual(
          a.violations.map((v) => v.id),
          [],
        );
      }
    }
    await p.goto(base + "/methodology#impact-edit", {
      waitUntil: "networkidle",
    });
    await p.waitForFunction(
      () =>
        document
          .querySelector(".section-navigation a[aria-current=location]")
          ?.getAttribute("href") === "#impact-edit",
    );
    await p.goto(base + "/#human-support", { waitUntil: "networkidle" });
    await p.waitForFunction(
      () =>
        document
          .querySelector(".section-navigation a[aria-current=location]")
          ?.getAttribute("href") === "#human-support",
    );
    await p.goto(base + "/contact", { waitUntil: "networkidle" });
    assert.equal(await p.locator(".section-navigation").count(), 0);
    await p
      .getByRole("link", { name: "marcus@mysocialimpact.org", exact: true })
      .waitFor();
    await p.goBack({ waitUntil: "networkidle" });
    assert.equal(new URL(p.url()).hash, "#human-support");
    await p.goForward({ waitUntil: "networkidle" });
    assert.equal(new URL(p.url()).pathname, "/contact");
    await p.locator("header .brand").click();
    await p.waitForURL(base + "/");
    await p
      .locator("header")
      .getByRole("link", { name: "LOGIN", exact: true })
      .click();
    await p.waitForURL(base + "/reviews#login");
    await p
      .getByRole("button", { name: "Send my sign-in link", exact: true })
      .waitFor();
    assert.equal(await p.locator(".section-navigation").count(), 0);
    for (const [destination, label] of [
      ["/review", "Review a Report"],
      ["/methodology", "Methodology"],
      ["/your-impact-director", "Your Impact Director"],
      ["/contact", "Contact"],
      ["/reviews", "My Reports"],
    ]) {
      if (width <= 1280)
        await p.locator(".menu-toggle[aria-expanded=false]").click();
      await p
        .locator("#main-nav")
        .getByRole("link", { name: label, exact: true })
        .click();
      await p.waitForURL((url) => url.pathname === destination);
      assert.equal(
        (await p.locator("#main-nav [aria-current=page]").textContent()).trim(),
        label,
      );
    }
    assert.deepEqual(errors, []);
    console.log({
      width,
      height,
      pageStates: true,
      sectionScroll: true,
      directLinks: true,
      history: true,
      login: true,
      noOverflow: true,
    });
    await c.close();
  }
} finally {
  await b.close();
}
