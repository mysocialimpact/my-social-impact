import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stateLabel,
  stateAction,
  type AssessmentState,
} from "../src/components/workspace-types";
test("workspace never advertises results without genuine completed output", () => {
  const a: AssessmentState = {
    id: "test",
    framework: "claims",
    status: "queued",
    has_result: false,
    viewed: false,
    score: null,
    delivery: null,
  };
  assert.equal(stateLabel(), "Not started");
  assert.equal(stateAction(), "Start review");
  assert.equal(stateLabel(a), "Preparing");
  assert.equal(stateAction(a), "View progress");
  assert.equal(stateLabel({ ...a, status: "complete" }), "Needs attention");
  assert.equal(stateAction({ ...a, status: "complete" }), "Resolve issue");
  assert.equal(
    stateLabel({ ...a, status: "complete", has_result: true }),
    "Completed",
  );
  assert.equal(
    stateAction({ ...a, status: "complete", has_result: true }),
    "View results",
  );
  assert.equal(stateLabel({ ...a, status: "failed" }), "Needs attention");
});
