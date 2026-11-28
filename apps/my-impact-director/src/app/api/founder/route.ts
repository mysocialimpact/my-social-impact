import { z } from "zod";
import { founder } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { failure, sameOrigin, readJson } from "@/lib/security";
import {
  founderOverview,
  founderAccounts,
  founderActivity,
  founderReviews,
  founderEnquiries,
  founderCosts,
} from "@/lib/founder-data";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    await founder(req);
    const p = new URL(req.url).searchParams,
      section = p.get("section") || "overview",
      q = (p.get("q") || "").slice(0, 150),
      status = (p.get("status") || "").slice(0, 30),
      owner = (p.get("owner") || "").slice(0, 150),
      days = [0, 7, 30, 90].includes(Number(p.get("days")))
        ? Number(p.get("days"))
        : 30,
      page = Math.max(1, Math.min(1000, Number(p.get("page")) || 1));
    let data: unknown;
    switch (section) {
      case "accounts":
        data = await founderAccounts(q, page);
        break;
      case "activity":
        data = await founderActivity(q, days);
        break;
      case "reviews":
        data = await founderReviews(q, status, days, owner);
        break;
      case "enquiries":
        data = await founderEnquiries(q, status, days, owner);
        break;
      case "costs":
        data = await founderCosts(days);
        break;
      default:
        data = await founderOverview();
    }
    return Response.json(
      { data },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await founder(req);
    const input = z
      .object({
        id: z.uuid(),
        status: z.enum(["new", "contacted", "closed"]),
        converted: z.boolean(),
      })
      .strict()
      .parse(await readJson(req));
    await transaction(async (c) => {
      await c.query(
        "UPDATE director.enquiries SET status=$2,converted_at=CASE WHEN $3 THEN COALESCE(converted_at,now()) ELSE NULL END WHERE id=$1",
        [input.id, input.status, input.converted],
      );
      await c.query(
        "INSERT INTO director.audit(actor_id,action,resource_id,metadata) VALUES($1,'enquiry-updated',$2,$3)",
        [
          u.id,
          input.id,
          JSON.stringify({ status: input.status, converted: input.converted }),
        ],
      );
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
