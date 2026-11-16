import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath } from "../src/lib/return-path";
test("login returns only to internal product destinations", () => {
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/login",
    "/api/account",
    "/reviews\n//evil.example",
  ])
    assert.equal(safeReturnPath(value), "/reviews");
  assert.equal(
    safeReturnPath("/reviews/aaa?results=1"),
    "/reviews/aaa?results=1",
  );
  assert.equal(safeReturnPath("/account"), "/account");
  assert.equal(safeReturnPath("/#upload"), "/#upload");
});
