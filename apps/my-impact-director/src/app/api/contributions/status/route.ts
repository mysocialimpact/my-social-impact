import { z } from "zod";
import { visitor } from "@/lib/auth";
import {
  cancelContribution,
  ownedContribution,
  refreshContribution,
} from "@/lib/contributions";
import { failure, readJson, sameOrigin, rateLimit } from "@/lib/security";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await visitor(req);
    const { id, cancel } = z
      .object({ id: z.uuid(), cancel: z.boolean().optional() })
      .strict()
      .parse(await readJson(req));
    await rateLimit(`support-status:${user.id}`, 90, 900);
    const row = await ownedContribution(user, id);
    return Response.json(
      await (cancel ? cancelContribution(row) : refreshContribution(row)),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
