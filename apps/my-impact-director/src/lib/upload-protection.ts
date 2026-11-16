import type { Identity } from "./auth";
import { privateNetworkKey } from "./access";
import { rateLimit } from "./security";

// A shared office/mobile network is not a person's free-review allowance.
// Versioned buckets retire the old three-starts-per-IP/day counters immediately.
export async function protectUpload(req: Request, user: Identity) {
  if (user.anonymous)
    await rateLimit(`upload-network-v2:${privateNetworkKey(req)}`, 120, 3600);
  await rateLimit(`upload-attempt-v2:${user.id}`, 30, 3600);
}
