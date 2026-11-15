import { request } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const info = JSON.parse(
  await readFile("/workspace/mid-anonymous-review.json", "utf8"),
);
const ctx = await request.newContext({
  baseURL: config.url,
  storageState: "/workspace/mid-anonymous-state.json",
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
try {
  for (let i = 0; i < 80; i++) {
    const response = await ctx.get("/api/reviews/" + info.id);
    if (!response.ok())
      throw Error("Review access failed: " + response.status());
    const r = await response.json();
    console.log(
      JSON.stringify({
        status: r.status,
        stage: r.stage,
        cursor: r.visual_cursor,
        attempts: r.attempts,
        error: r.error_code,
        cost: r.cost_usd,
      }),
    );
    if (r.status === "complete") {
      await writeFile(
        "artifacts/live/genuine-anonymous-review.json",
        JSON.stringify(r, null, 2),
      );
      break;
    }
    if (r.status === "failed") break;
    if (
      (r.status === "queued" &&
        new Date(r.next_attempt_at).getTime() <= Date.now()) ||
      (r.status === "running" && new Date(r.lease_until).getTime() < Date.now())
    ) {
      const w = await ctx.get("/api/worker?review=" + info.id, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
        timeout: 310000,
      });
      console.log(JSON.stringify({ worker: w.status() }));
    } else await new Promise((resolve) => setTimeout(resolve, 20000));
  }
} finally {
  await ctx.dispose();
}
