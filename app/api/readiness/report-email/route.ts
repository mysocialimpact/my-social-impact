export const runtime = "nodejs";

const endpoint = process.env.SORP_REPORT_EMAIL_API_URL || "https://sorp2026.mysocialimpact.org/api/report-email";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "We could not read those email details." }, { status: 400 }); }

  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "We could not send your report just now. Your report remains available on this page." }, { status: 502 });
  }
}
