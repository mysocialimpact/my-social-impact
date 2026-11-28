import { identity } from "@/lib/auth";
import { prepareWorkspaceLink } from "@/lib/workspace-link";
import { sameOrigin, failure } from "@/lib/security";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const cookie = await prepareWorkspaceLink(await identity(req));
    return Response.json(
      { ok: true },
      { headers: { "set-cookie": cookie, "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
