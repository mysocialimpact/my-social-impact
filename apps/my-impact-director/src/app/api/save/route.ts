import { after } from "next/server";
import { sendPendingReports } from "@/lib/report-delivery";
import { z } from "zod";
import {
  emailEnabled,
  requestEmailSave,
  redeemEmailLink,
} from "@/lib/email-save";
import { sameOrigin, readJson, failure } from "@/lib/security";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    { emailEnabled: emailEnabled() },
    { headers: { "cache-control": "no-store" } },
  );
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const input = await readJson(req);
    if (input?.action === "redeem") {
      const data = z
        .object({ action: z.literal("redeem"), token: z.string().max(100) })
        .strict()
        .parse(input);
      const result = await redeemEmailLink(data.token, req);
      after(() => sendPendingReports());
      return Response.json(
        { destination: result.destination },
        {
          headers: { "set-cookie": result.cookie, "cache-control": "no-store" },
        },
      );
    }
    const result = await requestEmailSave(req, input);
    after(() => sendPendingReports());
    return Response.json(
      { ok: true, verified: result?.verified || false },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
