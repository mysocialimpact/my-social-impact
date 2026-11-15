import { request } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const context = await request.newContext({
  baseURL: config.url,
  storageState: "/workspace/mid-live-qa-state.json",
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
try {
  const r = await context.post("/api/discovery", {
    headers: { origin: config.url },
    data: {
      action: "search",
      organisation: "Small Charity Support UK charity 1161963",
    },
    timeout: 280000,
  });
  const d = await r.json();
  await writeFile("artifacts/live/discovery.json", JSON.stringify(d, null, 2));
  console.log(
    JSON.stringify({
      status: r.status(),
      count: d.candidates?.length,
      error: d.error,
      candidates: d.candidates?.map(({ title, source, year, url }) => ({
        title,
        source,
        year,
        url,
      })),
    }),
  );
} finally {
  await context.dispose();
}
