export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const multipart = request.headers.get("content-type")?.startsWith("multipart/form-data") || false;
    const body = multipart ? await request.formData() : await request.text();
    if (!multipart && (body as string).length > 200000) return Response.json({ error: "This review request is too large." }, { status: 413 });
    if (multipart && (body as FormData).get("report") instanceof File && ((body as FormData).get("report") as File).size > 40_000_000) return Response.json({ error: "Choose one PDF report under 40 MB." }, { status: 413 });
    const base = process.env.SORP_READINESS_API_URL || "https://sorp2026.mysocialimpact.org/api/readiness";
    const response = await fetch(new URL("/api/published-review", base), { method: "POST", headers: multipart ? undefined : { "content-type": "application/json" }, body });
    if (!response.headers.get("content-type")?.includes("json")) throw new Error("Unexpected research response");
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch { return Response.json({ error: "Public research could not be reached. Please try again; your progress is safe." }, { status: 502 }); }
}
