import { createGuest } from "@/lib/access";
import { identity, sessionCookie } from "@/lib/auth";
import { AppError, failure, sameOrigin } from "@/lib/security";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    if (sessionCookie(req)) {
      try {
        return Response.json(
          { user: await identity(req) },
          { headers: { "cache-control": "no-store" } },
        );
      } catch (e) {
        if (!(e instanceof AppError && e.status === 401)) throw e;
      }
    }
    const { user, cookie } = await createGuest(req);
    const headers = new Headers({ "cache-control": "no-store" });
    if (cookie) headers.set("set-cookie", cookie);
    return Response.json({ user }, { headers });
  } catch (e) {
    return failure(e);
  }
}
