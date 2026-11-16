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
      "INSERT INTO director.marketing_consent(owner_id,opted_in,wording_version,wording,source) VALUES($1,$2,$3,$4,$5) ON CONFLICT(owner_id) DO UPDATE SET opted_in=$2,wording_version=$3,wording=$4,source=$5,recorded_at=now()",
      [owner, optedIn, CONSENT_VERSION, CONSENT_WORDING, source],
    );
    await c.query(
      "INSERT INTO director.marketing_consent_events(owner_id,opted_in,wording_version,wording,source) VALUES($1,$2,$3,$4,$5)",
      [owner, optedIn, CONSENT_VERSION, CONSENT_WORDING, source],
    );
  });
}
export async function preferences(owner: string) {
  const [row] = await query<{
    opted_in: boolean;
    recorded_at: string;
    wording_version: string;
  }>(
    "SELECT opted_in,recorded_at,wording_version FROM director.marketing_consent WHERE owner_id=$1",
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
