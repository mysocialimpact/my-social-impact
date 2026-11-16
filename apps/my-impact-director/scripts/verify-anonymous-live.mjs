import { request } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const { id } = JSON.parse(
  await readFile("/workspace/mid-anonymous-review.json", "utf8"),
);
const options = {
  baseURL: config.url,
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
};
const owner = await request.newContext({
    ...options,
    storageState: "/workspace/mid-anonymous-state.json",
  }),
  other = await request.newContext(options);
const checks = [];
try {
  const share = new URL(config.url);
  if (config.bypass) share.searchParams.set("_vercel_share", config.bypass);
  await other.get(share.href);
  assert.equal((await other.get("/api/reviews/" + id)).status(), 401);
  checks.push("No-cookie review denied");
  assert.equal(
    (
      await other.post("/api/visitor", {
        headers: { origin: "https://unrelated.invalid" },
      })
    ).status(),
    403,
  );
  checks.push("Cross-origin creation denied");
  assert.equal(
    (
      await other.post("/api/visitor", { headers: { origin: config.url } })
    ).status(),
    200,
  );
  for (const suffix of ["", "/source", "/export"])
    assert.equal(
      (await other.get("/api/reviews/" + id + suffix)).status(),
      404,
    );
  checks.push("Second guest cannot read results, source or export");
  assert.equal((await owner.get("/api/admin")).status(), 401);
  checks.push("Guest denied founder access");
  const source = await owner.get("/api/reviews/" + id + "/source");
  assert.equal(source.status(), 200);
  const original = await readFile(
    "artifacts/real-reports/small-charity-support-2024.pdf",
  );
  const sha = (b) => createHash("sha256").update(b).digest("hex");
  assert.equal(sha(await source.body()), sha(original));
  checks.push("Original PDF byte-for-byte intact");
  const saved = await (await owner.get("/api/reviews")).json();
  assert.ok(saved.reviews.some((r) => r.id === id));
  checks.push("Guest can return to saved browser review");
  const email = await (await owner.get("/api/save")).json();
  checks.push("Email capability: " + email.emailEnabled);
  const enquiry = await owner.post("/api/enquiries", {
    headers: { origin: config.url },
    data: {
      service: "expert-review",
      name: "Anonymous deployment QA",
      email: "qa@example.invalid",
      message: "Deployment verification only. No follow-up required. " + id,
      reviewId: id,
      shareReview: true,
      contactConsent: true,
    },
  });
  assert.equal(enquiry.status(), 201);
  const e = await enquiry.json();
  checks.push("Anonymous linked enquiry saved");
  await writeFile(
    "artifacts/live/anonymous-security.json",
    JSON.stringify({ id, enquiryId: e.id, checks }, null, 2),
  );
  console.log(JSON.stringify({ checks, enquiryId: e.id }));
} finally {
  await owner.dispose();
  await other.dispose();
}
