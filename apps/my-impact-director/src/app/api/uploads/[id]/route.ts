import { z } from "zod";
import { after } from "next/server";
import { visitor, reviewAccount } from "@/lib/auth";
import {
  sameOrigin,
  readJson,
  failure,
  AppError,
  rateLimit,
} from "@/lib/security";
import {
  storePart,
  finishUpload,
  finishSchema,
  discardUpload,
} from "@/lib/uploads";
import { UPLOAD_CHUNK } from "@/lib/file-limits";
import { drain } from "@/lib/pipeline";
export const maxDuration = 300;
type Context = { params: Promise<{ id: string }> };
async function parameters(req: Request, ctx: Context) {
  sameOrigin(req);
  return {
    user: await visitor(req),
    id: z.uuid().parse((await ctx.params).id),
  };
}
export async function PUT(req: Request, ctx: Context) {
  try {
    const { user, id } = await parameters(req, ctx);
    const raw = new URL(req.url).searchParams.get("part");
    if (raw === null || !/^\d{1,2}$/.test(raw))
      throw new AppError(
        400,
        "Part of this upload is missing. Please try again.",
      );
    const part = Number(raw);
    if (
      part > 16 ||
      Number(req.headers.get("content-length") || 0) > UPLOAD_CHUNK
    )
      throw new AppError(
        413,
        "Part of this upload was too large. Please try again.",
      );
    const reader = req.body?.getReader();
    if (!reader)
      throw new AppError(
        400,
        "Part of this upload is missing. Please try again.",
      );
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        total += next.value.length;
        if (total > UPLOAD_CHUNK) {
          await reader.cancel();
          throw new AppError(
            413,
            "Part of this upload was too large. Please try again.",
          );
        }
        chunks.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    return Response.json(
      await storePart(user, id, part, Buffer.concat(chunks, total)),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    const user = await reviewAccount(req),
      id = z.uuid().parse((await ctx.params).id);
    const data = finishSchema.parse(await readJson(req));
    await rateLimit(`upload-finish:${user.id}`, 30, 3600);
    const review = await finishUpload(user, id, data);
    after(() => drain(review.id));
    return Response.json(review, {
      status: 201,
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request, ctx: Context) {
  try {
    const { user, id } = await parameters(req, ctx);
    await discardUpload(user, id);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
