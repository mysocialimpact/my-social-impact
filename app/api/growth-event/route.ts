export const runtime = "nodejs";

const allowed = new Set(["free_assessment_completed", "result_viewed", "review_cta_clicked", "review_payment_started", "voluntary_support_shown", "contribution_started", "voluntary_support_no_thanks"]);

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
