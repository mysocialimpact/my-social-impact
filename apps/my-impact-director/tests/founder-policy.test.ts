import { test } from "node:test";
import assert from "node:assert/strict";
import {
  founderProof,
  classifyAccount,
  FOUNDER_EMAILS,
} from "../src/lib/founder-policy";
import { safeReturnPath } from "../src/lib/return-path";
import { funnelRates } from "../src/lib/founder-data";
test("founder access requires verified ownership of an exact approved address", () => {
  for (const email of FOUNDER_EMAILS) {
    assert.equal(founderProof(email, true), true);
    assert.equal(founderProof(email, false), false);
  }
  for (const email of [
    "marcus@theideasshed.com.evil.test",
    "other@mysocialimpact.org",
    "founder@example.invalid",
    "relay@privaterelay.appleid.com",
  ]) {
    assert.equal(founderProof(email, true), false);
  }
});
test("account cleanup preserves ambiguous real domains and report-bearing identities", () => {
  for (const email of [
    "test@test.com",
    "marcus@test.com",
    "tgstgty@sdfgsdfg.com",
    "marcus@marcuswarry.com",
  ]) {
    assert.equal(classifyAccount({ id: "existing", email }).retire, false);
  }
  for (const email of [
    "qa@example.invalid",
    "fake@example.com",
    "marcus+mid-qa-mwje31g6@mysocialimpact.org",
  ]) {
    assert.equal(classifyAccount({ id: "qa", email }).classification, "test");
  }
  assert.equal(
    classifyAccount({ id: "founder", email: FOUNDER_EMAILS[0] }).retire,
    false,
  );
});
test("sign-in destinations stay within permitted application routes", () => {
  for (const next of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/api/admin",
    "/admin/anything",
  ]) {
    assert.equal(safeReturnPath(next), "/reviews");
  }
  assert.equal(safeReturnPath("/founder"), "/founder");
  assert.equal(
    safeReturnPath("/reviews/abc?tab=scores"),
    "/reviews/abc?tab=scores",
  );
});
test("conversion rates handle zero denominators and show real drop-off", () => {
  assert.deepEqual(funnelRates([10, 5, 0, 0]), [
    { count: 10, rate: null, dropoff: null },
    { count: 5, rate: 50, dropoff: 5 },
    { count: 0, rate: 0, dropoff: 5 },
    { count: 0, rate: null, dropoff: 0 },
  ]);
});

import { POST as startSocial } from "../src/app/api/auth/[...all]/route";
test("social sign-in rejects foreign origins before touching credentials or counters", async () => {
  const r = await startSocial(
    new Request("https://www.myimpactdirector.com/api/auth/sign-in/social", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    }),
  );
  assert.equal(r.status, 403);
});
