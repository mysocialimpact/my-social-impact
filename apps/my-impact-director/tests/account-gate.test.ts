import { test } from "node:test";
import assert from "node:assert/strict";
import { assertReviewAccount } from "../src/lib/auth";
import type { Identity } from "../src/lib/auth";
test("new processing requires an account, with separate ownership and email-verification checks", () => {
  const user: Identity = {
    id: "qa",
    email: "qa@example.invalid",
    name: "QA",
    founder: false,
    anonymous: false,
    emailVerified: false,
  };
  assert.equal(assertReviewAccount(user), user);
  assert.throws(() => assertReviewAccount({ ...user, anonymous: true }), {
    status: 401,
    code: "ACCOUNT_REQUIRED",
  });
  assert.throws(() => assertReviewAccount({ ...user, email: "" }), {
    status: 401,
    code: "ACCOUNT_REQUIRED",
  });
});
