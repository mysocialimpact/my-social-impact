import { visitor } from "@/lib/auth";
import { getReview, reviewAccess } from "@/lib/reviews";
import { failure, AppError } from "@/lib/security";
import { exportPdf } from "@/lib/export";
import type { ReviewResult } from "@/lib/pipeline";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await visitor(req);
    const review = await getReview(user, (await ctx.params).id);
    if (!(await reviewAccess(user, review)))
      throw new AppError(
        403,
        "Confirm your email to receive the full detailed report, free.",
      );
    if (review.status !== "complete" || !review.result)
      throw new AppError(409, "The review is still being prepared.");
    return new Response(
      new Uint8Array(await exportPdf(review.result as ReviewResult)),
      {
        headers: {
          "content-type": "application/pdf",
          "content-disposition":
            'attachment; filename="my-impact-director-review.pdf"',
          "cache-control": "private, no-store",
        },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
