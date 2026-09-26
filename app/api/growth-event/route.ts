export const runtime = "nodejs";

const allowed = new Set([
  "assessment_completed", "result_preview_viewed",
  "usefulness_very", "usefulness_somewhat", "usefulness_not_really",
  "human_review_selected", "support_5_selected", "support_custom_selected", "free_report_selected",
  "report_opened", "email_report_requested",
  "review_payment_started", "contribution_started",
  "quick_review_feedback",
  "assessment_started", "organisation_found", "organisation_confirmed", "quick_review_reached",
  "quick_review_feedback_submitted", "deep_dive_started", "full_review_viewed", "report_emailed",
  "full_review_feedback_submitted",
  "support_selected", "support_payment_started", "human_review_payment_started",
  "book_conversation_clicked", "contact_email_clicked", "impact_report_found", "impact_report_uploaded",
  "save_and_exit", "assessment_resumed", "last_stage_reached",
  "email_captured", "public_research_completed", "snapshot_viewed", "tar_score", "wider_evidence_score",
  "snapshot_feedback_rating", "guided_conversation_started", "guided_conversation_completed",
  "full_report_viewed", "pdf_email_sent", "final_feedback_rating", "support_ask_viewed",
  "deep_dive_offer_viewed", "deep_dive_clicked", "ten_minute_call_clicked", "stage_viewed", "non_sorp_identified",
  // Retained for older live sessions while the new completion journey rolls out.
  "free_assessment_completed", "result_viewed", "review_cta_clicked", "voluntary_support_shown", "voluntary_support_no_thanks",
]);

export async function POST(request: Request) {
  if (!process.env.COW_GROWTH_EVENT_URL || !process.env.COW_GROWTH_EVENT_KEY) return Response.json({ accepted: false }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid event." }, { status: 400 }); }
  if (!allowed.has(String(body.eventType || ""))) return Response.json({ error: "Unsupported event." }, { status: 400 });
  try {
    const response = await fetch(process.env.COW_GROWTH_EVENT_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.COW_GROWTH_EVENT_KEY}` },
      body: JSON.stringify({ ...body, source: "msi_sorp_web", occurredAt: new Date().toISOString() }),
    });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ accepted: false }, { status: 502 });
  }
}
