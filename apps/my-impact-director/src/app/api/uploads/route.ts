import { reviewAccount } from "@/lib/auth";
import { protectUpload } from "@/lib/upload-protection";
import { beginUpload, uploadSchema } from "@/lib/uploads";
import { sameOrigin, readJson, failure } from "@/lib/security";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const data = uploadSchema.parse(await readJson(req));
    const user = await reviewAccount(req);
    await protectUpload(req, user);
    return Response.json(await beginUpload(user, data), {
      status: 201,
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
