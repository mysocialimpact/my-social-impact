import { visitor } from "@/lib/auth";
import { sourceFile } from "@/lib/reviews";
import { failure } from "@/lib/security";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const file = await sourceFile(await visitor(req), (await ctx.params).id);
    return new Response(new Uint8Array(file), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="source-report.pdf"',
        "cache-control": "private, no-store",
        "content-security-policy": "sandbox; default-src 'none'",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
