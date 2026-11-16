import { chromium } from "@playwright/test";
const base = process.argv[2] || "http://localhost:3001";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
  ...(!base.includes("localhost") && process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
  [390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const i of document.images) i.loading = "eager";
    await Promise.all(
      [...document.images].map((i) => i.decode().catch(() => {})),
    );
  });
  await page.screenshot({ path: `artifacts/radical/${width}-initial.png` });
  await page.screenshot({
    path: `artifacts/radical/${width}-full.png`,
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      width,
      height: await page.evaluate(() => document.body.scrollHeight),
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      upload: await page.locator(".dropzone").boundingBox(),
      bar: await page.locator(".permanent-actions").boundingBox(),
      credit: await page.locator(".director-credit").boundingBox(),
    }),
  );
  await page.close();
}
await browser.close();
