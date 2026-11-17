import { test } from "node:test";
import assert from "node:assert/strict";
import { bands, displayScore, brief } from "../src/lib/publication";
test("all ten publication bands are taken from the rounded display number", () => {
  bands.forEach((label, i) => {
    for (const score of [i * 10, i * 10 + 9])
      assert.equal(displayScore(score)?.label, label);
  });
  assert.deepEqual(displayScore(89.5), { percent: 90, label: "Excellent" });
  assert.equal(displayScore(100)?.label, "Excellent");
  assert.deepEqual(displayScore(15, 20), { percent: 75, label: "Good" });
  assert.equal(displayScore(null), null);
  assert.equal(displayScore(101), null);
  assert.equal(
    brief(
      "The chart is hard to interpret. Label each axis directly. However, keep the original units.",
      true,
    ),
    "Label each axis directly. However, keep the original units.",
  );
  assert.equal(
    brief(
      "The chart gives a clear trend. However, the scale is missing. See the appendix.",
    ),
    "The chart gives a clear trend. However, the scale is missing.",
  );
});
