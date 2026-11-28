import { secretMatches } from "@/lib/security";
import {
  analyseFeedback,
  recordFeedbackCapability,
  verifyFeedbackModel,
} from "@/lib/feedback-analysis";
import { sendFeedbackMail, reconcileFeedbackMail } from "@/lib/feedback-mail";
export const maxDuration = 120;
export async function GET(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    !secretMatches(
      req.headers.get("authorization") || "",
      "Bearer " + process.env.CRON_SECRET,
    )
  )
    return new Response(null, { status: 401 });
  if (new URL(req.url).searchParams.get("check") === "model")
    return Response.json({ available: await verifyFeedbackModel() });
  await Promise.all([
    recordFeedbackCapability(),
    analyseFeedback(),
    sendFeedbackMail(),
    reconcileFeedbackMail(),
  ]);
  return Response.json({ ok: true });
}
