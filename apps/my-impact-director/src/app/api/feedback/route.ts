import { createHash, randomUUID } from "node:crypto";
import { visitor } from "@/lib/auth";
import { privateNetworkKey } from "@/lib/access";
import { transaction, query } from "@/lib/db";
import {
  AppError,
  sameOrigin,
  failure,
  rateLimit,
  readJson,
} from "@/lib/security";
import { feedbackInput } from "@/lib/feedback-input";
import { publicationFeedbackContext } from "@/lib/publication-sharing";
import { feedbackReviewContext } from "@/lib/reviews";

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const data = feedbackInput.parse(await readJson(req, 24000));
    if (data.website) throw new AppError(400, "Please try again.");
    const user = await visitor(req);
    const id = data.requestId || randomUUID();
    const hash = createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
    const replay = (row: { owner_id: string; payload_hash: string }) => {
      if (row.owner_id !== user.id || row.payload_hash !== hash)
        throw new AppError(409, "Please start a new feedback submission.");
      return Response.json({ id, saved: true });
    };
    const [prior] = await query<{ owner_id: string; payload_hash: string }>(
      "SELECT owner_id,payload_hash FROM director.feedback WHERE id=$1",
      [id],
    );
    if (prior) return replay(prior);
    await rateLimit(`feedback-network:${privateNetworkKey(req)}`, 10, 86400);
    await rateLimit(`feedback:${user.id}`, 5, 86400);
    const review = data.reviewId
      ? await feedbackReviewContext(user, data.reviewId)
      : null;
    const shared =
      data.page === "/shared" && data.sharedToken
        ? await publicationFeedbackContext(data.sharedToken)
        : null;
    const result = await transaction(async (c) => {
      const { rowCount } = await c.query(
        `INSERT INTO director.feedback(id,owner_id,payload_hash,rating,comment,page,section,review_id,framework,methodology,models,signed_in,email,reply_consent,analysis_state,human_attention)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT DO NOTHING`,
        [
          id,
          user.id,
          hash,
          data.rating,
          data.comment,
          review ? "/reviews" : data.page,
          data.section,
          review?.id || null,
          review?.framework || shared?.framework || null,
          review?.version || shared?.version || null,
          review?.models || null,
          !user.anonymous,
          data.email || null,
          data.consent,
          (data.comment.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 3
            ? "pending"
            : "skipped",
          !!data.section ||
            !!data.comment ||
            data.consent ||
            (data.rating || 5) <= 2,
        ],
      );
      if (!rowCount)
        return replay(
          (
            await c.query(
              "SELECT owner_id,payload_hash FROM director.feedback WHERE id=$1",
              [id],
            )
          ).rows[0],
        );
      await c.query(
        "INSERT INTO director.feedback_mail(feedback_id,kind,recipient,body) VALUES($1,'notification',$2,$3)",
        [
          id,
          "marcus@mysocialimpact.org",
          "New feedback is ready in your private Founder Dashboard.\n\nhttps://www.myimpactdirector.com/admin#feedback-learning",
        ],
      );
      await c.query(
        "INSERT INTO director.daily_metrics(event,count) VALUES('feedback_created',1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
      );
      return Response.json({ id, saved: true }, { status: 201 });
    });
    return result;
  } catch (e) {
    return failure(e);
  }
}
