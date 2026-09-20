import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";

const MAX_PAYLOAD_BYTES = 900_000;

type SaveBody = {
  sessionId?: string;
  name?: string;
  position?: string;
  email?: string;
  progress?: unknown;
  currentStage?: number;
  completed?: boolean;
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function unavailable(error: unknown) {
  console.error("SORP saved progress unavailable", error);
  return Response.json({ error: "We could not securely save this just now. Your progress is still safe on this device." }, { status: 503 });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required.", signInRequired: true }, { status: 401 });
  try {
    const row = await env.DB.prepare(`
      SELECT p.name, p.position, p.contact_email AS contactEmail,
             a.session_id AS sessionId, a.payload, a.current_stage AS currentStage,
             a.completed, a.updated_at AS updatedAt
      FROM readiness_profiles p
      JOIN readiness_progress a ON a.user_id = p.user_id
      WHERE p.user_id = ?
      ORDER BY a.updated_at DESC
      LIMIT 1
    `).bind(user.userId).first<Record<string, unknown>>();
    if (!row) return Response.json({ progress: null });
    return Response.json({
      progress: {
        name: row.name,
        position: row.position,
        email: row.contactEmail,
        sessionId: row.sessionId,
        currentStage: row.currentStage,
        completed: Boolean(row.completed),
        updatedAt: row.updatedAt,
        data: JSON.parse(String(row.payload)),
      },
    });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required.", signInRequired: true }, { status: 401 });
  try {
    const body = await request.json() as SaveBody;
    const sessionId = clean(body.sessionId, 120);
    const name = clean(body.name, 120);
    const position = clean(body.position, 120);
    const contactEmail = clean(body.email, 254).toLowerCase();
    if (!sessionId || !name || !position || !/^\S+@\S+\.\S+$/.test(contactEmail) || !body.progress) {
      return Response.json({ error: "Name, position and a valid email address are required." }, { status: 400 });
    }
    const payload = JSON.stringify(body.progress);
    if (new TextEncoder().encode(payload).byteLength > MAX_PAYLOAD_BYTES) {
      return Response.json({ error: "This assessment is too large to save securely. Your device copy is still intact." }, { status: 413 });
    }
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO readiness_profiles (user_id, identity_email, name, position, contact_email, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          identity_email = excluded.identity_email,
          name = excluded.name,
          position = excluded.position,
          contact_email = excluded.contact_email,
          updated_at = excluded.updated_at
      `).bind(user.userId, user.email, name, position, contactEmail, now),
      env.DB.prepare(`
        INSERT INTO readiness_progress (session_id, user_id, payload, current_stage, completed, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          user_id = excluded.user_id,
          payload = excluded.payload,
          current_stage = excluded.current_stage,
          completed = excluded.completed,
          updated_at = excluded.updated_at
      `).bind(sessionId, user.userId, payload, Math.max(1, Math.min(7, Number(body.currentStage) || 1)), body.completed ? 1 : 0, now),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return unavailable(error);
  }
}
