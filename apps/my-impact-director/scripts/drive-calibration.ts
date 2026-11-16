import { request } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { database, query } from "../src/lib/db";
if (
  new URL(process.env.DATABASE_URL!).pathname !==
  "/my_impact_director_validation"
)
  throw Error("Validation database only");
const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const manifest = JSON.parse(
  await readFile("artifacts/calibration/manifest.json", "utf8"),
);
const pending = [...manifest.fixtures];
const context = await request.newContext({
  baseURL: config.url,
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const share = new URL(config.url);
share.searchParams.set("_vercel_share", config.bypass);
await context.get(share.href);
async function worker() {
  while (pending.length) {
    const fixture = pending.shift();
    for (let step = 0; step < 40; step++) {
      const [r] = await query(
        "SELECT v.*,r.pages FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE v.id=$1",
        [fixture.reviewId],
      );
      console.log(
        JSON.stringify({
          fixture: fixture.id,
          status: r.status,
          stage: r.stage,
          error: r.error_code,
        }),
      );
      if (r.status === "complete" || r.status === "failed") {
        await writeFile(
          `artifacts/calibration/${fixture.id}.json`,
          JSON.stringify({ ...fixture, ...r }, null, 2),
        );
        break;
      }
      const ready = Date.now() >= new Date(String(r.next_attempt_at)).getTime();
      if (ready && r.status === "queued") {
        const response = await context.get(
          "/api/worker?review=" + fixture.reviewId,
          {
            headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
            timeout: 310000,
          },
        );
        if (!response.ok()) throw Error("Worker failed: " + response.status());
      }
      await new Promise((resolve) => setTimeout(resolve, 20000));
    }
  }
}
try {
  await worker();
} finally {
  await context.dispose();
  await database().end();
}
