import { POST as sendReport } from "../report-email/route";

export const runtime = "nodejs";

// The public review has its own final-page-only contract. Other report journeys
// retain their existing endpoint and delivery behaviour.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.clone().json(); }
  catch { return Response.json({ error: "We could not read those email details." }, { status: 400 }); }
  if (!body || body.deliveryStage !== "done") {
    return Response.json({ error: "Report email is available only when the review is complete." }, { status: 409 });
  }
  return sendReport(request);
}
