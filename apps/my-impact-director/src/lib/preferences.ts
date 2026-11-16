import { query, transaction } from "./db";
export const CONSENT_VERSION = "mid-news-1.0";
export const CONSENT_WORDING =
  "I'd like to receive occasional news, practical ideas and updates from My Social Impact.";
export async function recordConsent(
  owner: string,
  optedIn: boolean,
  source: string,
) {
  await transaction(async (c) => {
    await c.query(
      "UPDATE director.users SET marketing_opt_in=$2,marketing_wording_version=$3,marketing_wording=$4,marketing_source=$5,marketing_recorded_at=now() WHERE id=$1",
      [owner, optedIn, CONSENT_VERSION, CONSENT_WORDING, source],
    );
    await c.query(
      "INSERT INTO director.audit(actor_id,action,resource_id,reason) VALUES($1,'marketing-consent',$1,$2)",
      [
        owner,
        JSON.stringify({
          optedIn,
          version: CONSENT_VERSION,
          wording: CONSENT_WORDING,
          source,
        }),
      ],
    );
  });
}
export async function preferences(owner: string) {
  const [row] = await query<{
    opted_in: boolean;
    recorded_at: string | null;
    wording_version: string | null;
  }>(
    "SELECT marketing_opt_in AS opted_in,marketing_recorded_at AS recorded_at,marketing_wording_version AS wording_version FROM director.users WHERE id=$1",
    [owner],
  );
  return (
    row || {
      opted_in: false,
      recorded_at: null,
      wording_version: CONSENT_VERSION,
    }
  );
}
