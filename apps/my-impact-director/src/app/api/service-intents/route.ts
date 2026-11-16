import { z } from "zod";
import { activeServices, type Service } from "@/lib/services";
import { visitor, type Identity } from "@/lib/auth";
import { privateNetworkKey } from "@/lib/access";
import { transaction } from "@/lib/db";
import { getReview, reviewAccess } from "@/lib/reviews";
import {
  AppError,
  failure,
  rateLimit,
  readJson,
  sameOrigin,
} from "@/lib/security";

const contact = z
  .object({
    kind: z.literal("contact"),
    service: z.enum(
      activeServices.map(([key]) => key) as [Service, ...Service[]],
    ),
    source: z.enum(["homepage", "review", "contact", "service", "pricing"]),
    reviewId: z.uuid().nullable(),
  })
  .strict();
const schema = z.discriminatedUnion("kind", [
  contact,
  z.object({ kind: z.literal("visit"), returning: z.boolean() }).strict(),
]);
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const data = schema.parse(await readJson(req));
    await rateLimit(`commercial-events:${privateNetworkKey(req)}`, 120, 3600);
    let user: Identity | null = null;
    if (data.kind === "contact") {
      try {
        user = await visitor(req);
      } catch (e) {
        if (!(e instanceof AppError && e.status === 401)) throw e;
      }
      if (data.reviewId) {
        if (!user || user.anonymous || !user.emailVerified)
          throw new AppError(
            403,
            "Sign in with a verified email to link a review.",
          );
        const review = await getReview(user, data.reviewId);
        if (
          review.status !== "complete" ||
          !review.result ||
          !(await reviewAccess(user, review))
        )
          throw new AppError(403, "Only your completed reviews can be linked.");
      }
    }
    await transaction(async (c) => {
      const events =
        data.kind === "visit"
          ? [
              "browser_session_started",
              ...(data.returning ? ["returning_browser_session"] : []),
            ]
          : ["service_cta_click", `service_interest_${data.service}`];
      for (const event of events)
        await c.query(
          "INSERT INTO director.daily_metrics(event,count) VALUES($1,1) ON CONFLICT(day,event) DO UPDATE SET count=director.daily_metrics.count+1",
          [event],
        );
      if (
        data.kind === "contact" &&
        user &&
        !user.anonymous &&
        user.emailVerified
      )
        await c.query(
          "INSERT INTO director.audit(actor_id,action,resource_id,reason) VALUES($1,$2,$3,$4)",
          [
            user.id,
            `service-intent:${data.service}`,
            data.reviewId,
            data.source,
          ],
        );
    });
    return Response.json(
      { recorded: "intent_only", emailSent: false },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
