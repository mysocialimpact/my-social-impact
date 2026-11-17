import { visitor } from "@/lib/auth";
import { failure } from "@/lib/security";
import {
  workspaces,
  selectedWorkspace,
  selectWorkspace,
} from "@/lib/workspace";
import { z } from "zod";
export async function GET(req: Request) {
  try {
    const value = new URL(req.url).searchParams.get("review");
    const id = value ? z.uuid().parse(value) : undefined;
    const user = await visitor(req);
    return Response.json(
      {
        workspace: id
          ? (await workspaces(user, id))[0]
          : await selectedWorkspace(user),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}

export async function PUT(req: Request) {
  try {
    const { sameOrigin } = await import("@/lib/security");
    sameOrigin(req);
    const { review } = z
      .object({ review: z.uuid() })
      .strict()
      .parse(await req.json());
    return Response.json(
      { workspace: await selectWorkspace(await visitor(req), review) },
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
