export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > 200000) return Response.json({ error: "This review request is too large." }, { status: 413 });
    const base = process.env.SORP_READINESS_API_URL || "https://sorp2026.mysocialimpact.org/api/readiness";
    const response = await fetch(new URL("/api/published-review", base), { method: "POST", headers: { "content-type": "application/json" }, body });
    if (!response.headers.get("content-type")?.includes("json")) throw new Error("Unexpected research response");
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch { return Response.json({ error: "Public research could not be reached. Please try again; your progress is safe." }, { status: 502 }); }
}
