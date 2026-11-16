import { visitor, accountAction, passwordResetAvailable } from "@/lib/auth";
import { failure, AppError, readJson } from "@/lib/security";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    if (new URL(req.url).searchParams.get("feature") === "password-reset")
      return Response.json(
        { available: await passwordResetAvailable() },
        { headers: { "cache-control": "no-store" } },
      );
    return Response.json(
      { user: await visitor(req) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof AppError && e.status === 401)
      return Response.json({ user: null });
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    return await accountAction(req, await readJson(req));
  } catch (e) {
    return failure(e);
  }
}
