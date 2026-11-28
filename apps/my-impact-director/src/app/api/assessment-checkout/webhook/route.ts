import { z } from "zod";
import { settleAssessmentEvent } from "@/lib/assessment-orders";
import { requireAssessmentStripe } from "@/lib/assessment-stripe";
import { verifyStripeSignature } from "@/lib/contribution-rules";
import { AppError, failure } from "@/lib/security";

const eventSchema = z.object({
  id: z.string().regex(/^evt_[A-Za-z0-9_]+$/),
  type: z.string().max(100),
  livemode: z.boolean(),
  account: z.string().optional(),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});

export async function POST(req: Request) {
  try {
    const config = requireAssessmentStripe();
    const reader = req.body?.getReader();
    if (!reader) throw new AppError(400, "Missing event.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 65536) {
          await reader.cancel();
          throw new AppError(413, "Event is too large.");
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (
      !verifyStripeSignature(
        raw,
        req.headers.get("stripe-signature") || "",
        config.webhookSecret,
      )
    ) {
      throw new AppError(
        400,
        "The Stripe event signature could not be verified.",
      );
    }
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new AppError(400, "The Stripe event body is invalid.");
    }
    await settleAssessmentEvent(config, eventSchema.parse(input));
    return Response.json({ received: true });
  } catch (e) {
    return failure(e);
  }
}
