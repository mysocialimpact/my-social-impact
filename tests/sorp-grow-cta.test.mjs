import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync(new URL("../app/sorp-result-actions.tsx", import.meta.url), "utf8");
const conversation = readFileSync(new URL("../app/sorp-readiness-conversation.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/growth-event/route.ts", import.meta.url), "utf8");

test("conversation CTA uses the requested address, organisation subject, and distinct Grow events", () => {
  assert.match(actions, /mailto:marcus@marcuswarry\.com\?subject=/);
  assert.match(actions, /SORP readiness conversation — \$\{organisation/);
  assert.match(actions, />marcus@marcuswarry\.com<\/a>/);
  for (const event of ["book_conversation_clicked", "contact_email_clicked", "report_emailed", "free_report_selected", "human_review_selected", "support_selected"])
    assert.match(actions, new RegExp(event));
});

test("assessment milestones and best-effort Grow submission stay separate from core workflow", () => {
  for (const event of ["assessment_started", "organisation_found", "organisation_confirmed", "quick_review_reached", "deep_dive_started", "assessment_completed", "full_review_viewed", "impact_report_found", "impact_report_uploaded", "save_and_exit", "assessment_resumed", "last_stage_reached"])
    assert.match(conversation, new RegExp(event));
  assert.match(route, /"book_conversation_clicked"/);
  assert.match(readFileSync(new URL("../app/sorp-growth.ts", import.meta.url), "utf8"), /catch \{ \/\* Grow outages/);
});
