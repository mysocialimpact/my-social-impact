import { identity } from "@/lib/auth";
import { managePublication } from "@/lib/publication-sharing";
import { sameOrigin, failure } from "@/lib/security";
type Context = { params: Promise<{ id: string }> };
async function handle(req: Request, ctx: Context) {
  try {
    if (req.method !== "GET") sameOrigin(req);
    const data = await managePublication(
      await identity(req),
      (await ctx.params).id,
      req.method as "GET" | "POST" | "DELETE",
    );
    return Response.json(data, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export { handle as GET, handle as POST, handle as DELETE };
