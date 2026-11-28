import { founder } from "@/lib/auth";
import {
  assessmentCommerceOverview,
  commerceAdminInput,
  manageAssessmentCommerce,
} from "@/lib/assessment-commerce-admin";
import { requireAssessmentStripe } from "@/lib/assessment-stripe";
import { failure, rateLimit, readJson, sameOrigin } from "@/lib/security";

const headers = { "cache-control": "no-store" };

export async function GET(req: Request) {
  try {
    requireAssessmentStripe();
    await founder(req);
    return Response.json(await assessmentCommerceOverview(), { headers });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request) {
  try {
    requireAssessmentStripe();
    sameOrigin(req);
    const user = await founder(req);
    await rateLimit("assessment-commerce-admin:" + user.id, 30, 900);
    const input = commerceAdminInput.parse(await readJson(req));
    return Response.json(await manageAssessmentCommerce(user, input), {
      headers,
    });
  } catch (e) {
    return failure(e);
  }
}
