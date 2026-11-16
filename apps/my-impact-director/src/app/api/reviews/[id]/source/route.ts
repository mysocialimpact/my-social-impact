import { visitor } from "@/lib/auth";
import { sourceFile } from "@/lib/reviews";
import { failure } from "@/lib/security";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const file = await sourceFile(await visitor(req), (await ctx.params).id);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let offset = 0; offset < file.length; offset += 64 * 1024)
          controller.enqueue(
            new Uint8Array(file.subarray(offset, offset + 64 * 1024)),
          );
        controller.close();
      },
    });
    return new Response(stream, {
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
