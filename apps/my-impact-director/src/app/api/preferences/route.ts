import { visitor } from "@/lib/auth";
import { preferences, recordConsent } from "@/lib/preferences";
import { failure, sameOrigin, readJson, AppError } from "@/lib/security";
export async function GET(req: Request) {
  try {
    const user = await visitor(req);
    if (user.anonymous)
      throw new AppError(401, "Log in to manage your account.");
    return Response.json(await preferences(user.id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await visitor(req);
    if (user.anonymous)
      throw new AppError(401, "Log in to manage your account.");
    const data = await readJson(req);
    if (typeof data.optedIn !== "boolean")
      throw new AppError(400, "Choose your email preference.");
    await recordConsent(user.id, data.optedIn, "account-settings");
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
