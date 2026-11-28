import { query } from "./db";

export async function accountEvent(
  owner: string,
  action: string,
  resource: string,
  key: string,
  metadata: Record<string, string | boolean | number> = {},
) {
  await query(
    "INSERT INTO director.audit(actor_id,action,resource_id,event_key,metadata) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_key) DO NOTHING",
    [owner, action, resource, key, JSON.stringify(metadata)],
  );
}
