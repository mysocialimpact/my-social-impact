import { identity } from "@/lib/auth";
import { failure, AppError } from "@/lib/security";
import { z } from "zod";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const id = (await ctx.params).id;
  if (!z.uuid().safeParse(id).success)
    return new Response(null, { status: 404 });
  const path = "/reviews/" + id + "?results=1";
  let dest = path;
  try {
    await identity(req);
  } catch (e) {
    if (!(e instanceof AppError) || e.status !== 401) return failure(e);
    dest = "/login?next=" + encodeURIComponent(path);
  }
  return new Response(null, {
    status: 303,
    headers: { location: dest, "cache-control": "private,no-store" },
  });
}
