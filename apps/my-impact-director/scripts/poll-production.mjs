import { request } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const { id } = JSON.parse(
  await readFile("/workspace/mid-anonymous-review.json", "utf8"),
);
const ctx = await request.newContext({
  baseURL: "https://www.myimpactdirector.com",
  storageState: "/workspace/mid-anonymous-state.json",
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
let last = "";
try {
  for (let i = 0; i < 60; i++) {
    const response = await ctx.get("/api/reviews/" + id);
    if (!response.ok()) throw Error("Private review HTTP " + response.status());
    const r = await response.json();
    const state = JSON.stringify({
      id,
      status: r.status,
      stage: r.stage,
      cursor: r.visual_cursor,
      attempts: r.attempts,
      error: r.error_code,
      cost: r.cost_usd,
    });
    if (state !== last) {
      console.log(state);
      last = state;
    }
    if (r.status === "complete") {
      await writeFile(
        "artifacts/live/genuine-anonymous-review.json",
        JSON.stringify(r, null, 2),
      );
      break;
    }
    if (r.status === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }
} finally {
  await ctx.dispose();
}
