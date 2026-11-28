import { getSocialAuth } from "@/lib/social-auth";
import { failure, rateLimit, sameOrigin } from "@/lib/security";
import { accessToken, EMAIL_COOKIE, privateNetworkKey } from "@/lib/access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(req: Request) {
  try {
    const path = new URL(req.url).pathname;
    if (
      req.method === "POST" &&
      (path.endsWith("/sign-in/social") || path.endsWith("/link-social"))
    ) {
      sameOrigin(req);
      // Durable, pseudonymous buckets. Never create a single global sign-in limit
      // or store raw IP addresses merely to limit authentication attempts.
      await rateLimit(
        `social-auth-network:${privateNetworkKey(req)}`,
        300,
        3600,
      );
      const ownedBrowser = accessToken(req, EMAIL_COOKIE) || accessToken(req);
      if (ownedBrowser)
        await rateLimit(`social-auth-browser:${ownedBrowser}`, 30, 3600);
    }
    return await (await getSocialAuth(req)).handler(req);
  } catch (e) {
    return failure(e);
  }
}
export { handle as GET, handle as POST };
