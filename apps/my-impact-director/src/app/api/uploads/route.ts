import { visitor } from "@/lib/auth";
import { privateNetworkKey } from "@/lib/access";
import { beginUpload, uploadSchema } from "@/lib/uploads";
import { sameOrigin, readJson, rateLimit, failure } from "@/lib/security";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const data = uploadSchema.parse(await readJson(req));
    const user = await visitor(req);
    if (user.anonymous)
      await rateLimit(`anonymous-upload:${privateNetworkKey(req)}`, 3, 86400);
    await rateLimit(`upload:${user.id}`, 10, 3600);
    return Response.json(await beginUpload(user, data), {
      status: 201,
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
