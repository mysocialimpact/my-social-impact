import { z } from "zod";
import { identity } from "@/lib/auth";
import {
  assessmentOrderInput,
  openAssessmentOrder,
  quoteAssessmentOrder,
} from "@/lib/assessment-orders";
import { requireAssessmentStripe } from "@/lib/assessment-stripe";
import { failure, rateLimit, readJson, sameOrigin } from "@/lib/security";

const inputSchema = z.discriminatedUnion("action", [
  assessmentOrderInput.extend({ action: z.literal("quote") }),
  assessmentOrderInput.extend({
    action: z.literal("checkout"),
    due: z.number().int().min(0).max(14900),
  }),
]);

export async function POST(req: Request) {
  try {
    requireAssessmentStripe();
    sameOrigin(req);
    const user = await identity(req);
    const input = inputSchema.parse(await readJson(req));
    await rateLimit("assessment-checkout:" + user.id, 30, 900);
    const result =
      input.action === "quote"
        ? await quoteAssessmentOrder(user, input)
        : await openAssessmentOrder(user, input);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
