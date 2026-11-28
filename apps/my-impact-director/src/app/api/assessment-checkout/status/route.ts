import { z } from "zod";
import { identity } from "@/lib/auth";
import {
  assessmentLevel,
  assessmentOrderStatus,
} from "@/lib/assessment-orders";
import { customerProjectCredits } from "@/lib/assessment-commerce-admin";
import { requireAssessmentStripe } from "@/lib/assessment-stripe";
import {
  AppError,
  failure,
  rateLimit,
  readJson,
  sameOrigin,
} from "@/lib/security";

export async function POST(req: Request) {
  try {
    requireAssessmentStripe();
    sameOrigin(req);
    const user = await identity(req);
    if (!user.emailVerified || user.anonymous)
      throw new AppError(
        403,
        "Verify your account to see payment information.",
      );
    const { id, review } = z
      .object({ id: z.uuid().optional(), review: z.uuid().optional() })
      .strict()
      .parse(await readJson(req));
    await rateLimit("assessment-status:" + user.id, 90, 900);
    const data = id
      ? await assessmentOrderStatus(user, id)
      : review
        ? { level: await assessmentLevel(user, review) }
        : { credits: await customerProjectCredits(user) };
    return Response.json(data, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
