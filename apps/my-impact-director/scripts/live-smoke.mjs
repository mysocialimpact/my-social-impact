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
  for (const path of ["/api/health", "/api/worker?check=ai"]) {
    const r = await context.get(path, {
      timeout: 200000,
      ...(path.includes("worker")
        ? { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }
        : {}),
    });
    console.log(
      JSON.stringify({
        path,
        status: r.status(),
        body: await r.json().catch(() => ({ unreadable: true })),
      }),
    );
  }
} finally {
  await context.dispose();
}
