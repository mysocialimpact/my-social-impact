import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import WebSocket from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";
import { attachDatabasePool } from "@vercel/functions";
let pool: Pool | undefined;
const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;
neonConfig.webSocketConstructor = proxy
  ? class extends WebSocket {
      constructor(address: string, protocols?: string | string[]) {
        super(address, protocols, { agent: new HttpsProxyAgent(proxy!) });
      }
    }
  : WebSocket;
export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("Database connection unavailable.");
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
      statement_timeout: 20000,
    });
    attachDatabasePool(pool);
  }
  return pool;
}
export async function query<T = Record<string, unknown>>(
  sql: string,
  values: unknown[] = [],
) {
  return (await database().query(sql, values)).rows as T[];
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const c = await database().connect();
  try {
    await c.query("BEGIN");
    const v = await fn(c);
    await c.query("COMMIT");
    return v;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
