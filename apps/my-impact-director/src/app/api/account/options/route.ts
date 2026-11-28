import { socialConfigured } from "@/lib/social-auth";
import { emailEnabled } from "@/lib/email-save";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    { ...socialConfigured(), email: emailEnabled() },
    { headers: { "cache-control": "no-store" } },
  );
}
