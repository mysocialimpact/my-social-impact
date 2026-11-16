import { visitor } from "@/lib/auth";
import { failure } from "@/lib/security";
import { workspaces } from "@/lib/workspace";
import { z } from "zod";
export async function GET(req: Request) {
  try {
    const id = z.uuid().parse(new URL(req.url).searchParams.get("review"));
    return Response.json(
      { workspace: (await workspaces(await visitor(req), id))[0] },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request) {
  try {
    const { sameOrigin } = await import("@/lib/security");
    sameOrigin(req);
    const user = await visitor(req);
    const { adoptCurrentReports } = await import("@/lib/account-workspace");
    await adoptCurrentReports(req, user);
    const { query } = await import("@/lib/db");
    await query("UPDATE director.users SET last_seen=now() WHERE id=$1", [
      user.id,
    ]);
    await query(
      "INSERT INTO director.daily_metrics(event,count) VALUES('workspace_opened',1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
    );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
