import { z } from "zod";
import {
  contributionConfig,
  processContributionEvent,
} from "@/lib/contributions";
import { verifyStripeSignature } from "@/lib/contribution-rules";
import { failure, AppError } from "@/lib/security";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    if (!contributionConfig().configured)
      throw new AppError(503, "Payments are not enabled.");
    const reader = req.body?.getReader();
    if (!reader) throw new AppError(400, "Missing event.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const r = await reader.read();
        if (r.done) break;
        size += r.value.length;
        if (size > 65536) {
          await reader.cancel();
          throw new AppError(413, "Event too large.");
        }
        chunks.push(r.value);
      }
    } finally {
      reader.releaseLock();
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (
      !verifyStripeSignature(
        raw,
        req.headers.get("stripe-signature") || "",
        process.env.STRIPE_WEBHOOK_SECRET || "",
      )
    )
      throw new AppError(400, "Invalid event signature.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AppError(400, "Invalid event body.");
    }
    const event = z
      .object({
        id: z.string().regex(/^evt_[A-Za-z0-9_]+$/),
        type: z.string().max(100),
        livemode: z.boolean(),
        account: z.string().optional(),
        data: z.object({ object: z.record(z.string(), z.unknown()) }),
      })
      .parse(parsed);
    await processContributionEvent(event);
    return Response.json({ received: true });
  } catch (e) {
    return failure(e);
  }
}
