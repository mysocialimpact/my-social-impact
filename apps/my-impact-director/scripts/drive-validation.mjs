import { request } from "@playwright/test";
import { readFile } from "node:fs/promises";
const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const context = await request.newContext({
  baseURL: config.url,
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
try {
  const share = new URL(config.url);
  share.searchParams.set("_vercel_share", config.bypass);
  await context.get(share.href);
  for (let i = 0; i < 8; i++) {
    const r = await context.get("/api/worker", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      timeout: 310000,
    });
    console.log(
      JSON.stringify({
        cycle: i + 1,
        status: r.status(),
        time: new Date().toISOString(),
      }),
    );
    if (!r.ok()) throw Error("Worker request failed");
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
} finally {
  await context.dispose();
}
