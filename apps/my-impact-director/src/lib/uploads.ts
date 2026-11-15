import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Identity } from "./auth";
import { query, transaction } from "./db";
import { createReview, getReview, ready } from "./reviews";
import { AppError } from "./security";
import { MAX_FILE, UPLOAD_CHUNK } from "./file-limits";
export const uploadSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/\.pdf$/i),
    size: z.number().int().min(40).max(MAX_FILE),
    consent: z.literal(true),
  })
  .strict();
export const finishSchema = z
  .object({ consent: z.literal(true), qualityConsent: z.boolean() })
  .strict();
const ids = (user: Identity) => user.accessIds || [user.id];
export async function beginUpload(
  user: Identity,
  input: z.infer<typeof uploadSchema>,
) {
  if (!ready())
    throw new AppError(
      503,
      "Reviews are temporarily paused. Please try again shortly.",
    );
  const [row] = await query<{ id: string }>(
    "INSERT INTO director.uploads(owner_id,title,file_size) VALUES($1,$2,$3) RETURNING id",
    [user.id, input.name, input.size],
  );
  return { id: row.id, chunkSize: UPLOAD_CHUNK };
}
export async function storePart(
  user: Identity,
  id: string,
  part: number,
  bytes: Buffer,
) {
  return transaction(async (c) => {
    const {
      rows: [upload],
    } = await c.query(
      "SELECT file_size,review_id,lease_until FROM director.uploads WHERE id=$1 AND owner_id=ANY($2::text[]) AND expires_at>now() FOR UPDATE",
      [id, ids(user)],
    );
    if (!upload)
      throw new AppError(
        404,
        "This upload has expired or is unavailable. Please select the report again.",
      );
    if (
      upload.review_id ||
      (upload.lease_until &&
        new Date(upload.lease_until).getTime() > Date.now())
    )
      throw new AppError(
        409,
        "Your report is being prepared. Please try again in a moment.",
      );
    const expected = Math.min(
      UPLOAD_CHUNK,
      upload.file_size - part * UPLOAD_CHUNK,
    );
    if (
      !Number.isInteger(part) ||
      part < 0 ||
      expected <= 0 ||
      bytes.length !== expected
    )
      throw new AppError(
        400,
        "Part of the upload was incomplete. Please try uploading the report again.",
      );
    if (part === 0 && bytes.subarray(0, 5).toString() !== "%PDF-")
      throw new AppError(
        400,
        "We couldn’t recognise this file as a PDF. Please try a PDF version of your report.",
      );
    const sha = createHash("sha256").update(bytes).digest("hex");
    const {
      rows: [previous],
    } = await c.query(
      "SELECT sha256 FROM director.upload_parts WHERE upload_id=$1 AND part=$2",
      [id, part],
    );
    if (previous && previous.sha256 !== sha)
      throw new AppError(
        409,
        "The selected file has changed. Please select the report again.",
      );
    if (!previous)
      await c.query(
        "INSERT INTO director.upload_parts(upload_id,part,bytes,sha256) VALUES($1,$2,$3,$4)",
        [id, part, bytes, sha],
      );
    return { ok: true };
  });
}
export async function finishUpload(
  user: Identity,
  id: string,
  input: z.infer<typeof finishSchema>,
) {
  const [existing] = await query<{ review_id: string | null }>(
    "SELECT review_id FROM director.uploads WHERE id=$1 AND owner_id=ANY($2::text[]) AND expires_at>now()",
    [id, ids(user)],
  );
  if (!existing)
    throw new AppError(
      404,
      "This upload has expired or is unavailable. Please select the report again.",
    );
  if (existing.review_id) {
    await getReview(user, existing.review_id);
    return { id: existing.review_id };
  }
  const token = randomUUID();
  const [upload] = await query<{ title: string; file_size: number }>(
    "UPDATE director.uploads SET lease_token=$3,lease_until=now()+interval '3 minutes' WHERE id=$1 AND owner_id=ANY($2::text[]) AND expires_at>now() AND review_id IS NULL AND (lease_until IS NULL OR lease_until<now()) RETURNING title,file_size",
    [id, ids(user), token],
  );
  if (!upload)
    throw new AppError(
      409,
      "Your report is being prepared. Please try again in a moment.",
    );
  try {
    const parts = await query<{ part: number; bytes: Buffer }>(
      "SELECT part,bytes FROM director.upload_parts WHERE upload_id=$1 ORDER BY part",
      [id],
    );
    const count = Math.ceil(upload.file_size / UPLOAD_CHUNK);
    if (
      parts.length !== count ||
      parts.some(
        (p, i) =>
          p.part !== i ||
          p.bytes.length !==
            Math.min(UPLOAD_CHUNK, upload.file_size - i * UPLOAD_CHUNK),
      )
    )
      throw new AppError(
        409,
        "The upload didn’t finish. Please try again — your selected report is still available in this browser.",
      );
    const review = await createReview(
      user,
      Buffer.concat(
        parts.map((p) => p.bytes),
        upload.file_size,
      ),
      upload.title,
      input.consent,
      input.qualityConsent,
    );
    await transaction(async (c) => {
      await c.query(
        "UPDATE director.uploads SET review_id=$3,lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2",
        [id, token, review.id],
      );
      await c.query("DELETE FROM director.upload_parts WHERE upload_id=$1", [
        id,
      ]);
    });
    return review;
  } catch (e) {
    await query(
      "UPDATE director.uploads SET lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2",
      [id, token],
    );
    throw e;
  }
}
export async function discardUpload(user: Identity, id: string) {
  await query(
    "DELETE FROM director.uploads WHERE id=$1 AND owner_id=ANY($2::text[]) AND (lease_until IS NULL OR lease_until<now())",
    [id, ids(user)],
  );
}
