import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { PDFDocument, PDFName, PDFRawStream, StandardFonts } from "pdf-lib";
import { database, query } from "../src/lib/db";
import { MAX_FILE, UPLOAD_CHUNK } from "../src/lib/file-limits";
import {
  beginUpload,
  storePart,
  finishUpload,
  discardUpload,
  uploadSchema,
} from "../src/lib/uploads";
import { sourceFile, getReview, deleteReview } from "../src/lib/reviews";
import { PUT as putPart } from "../src/app/api/uploads/[id]/route";
import { GET as sourceGet } from "../src/app/api/reviews/[id]/source/route";
import { createGuest } from "../src/lib/access";
import { mkdir, writeFile } from "node:fs/promises";
async function largePdf(size = 12_000_000) {
  const pdf = await PDFDocument.create(),
    font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage();
  page.drawText(
    "Large PDF upload verification — synthetic engineering fixture".replace(
      "—",
      "-",
    ),
    { x: 35, y: 740, size: 14, font },
  );
  page.drawText(
    "Testing the private upload, retry and original-document download.",
    { x: 35, y: 700, size: 11, font },
  );
  const payload = PDFRawStream.of(
    pdf.context.obj({
      Type: PDFName.of("Metadata"),
      Subtype: PDFName.of("XML"),
    }),
    Buffer.from("<!--" + "x".repeat(size) + "-->"),
  );
  const ref = pdf.context.register(payload);
  pdf.catalog.set(PDFName.of("Metadata"), ref);
  return Buffer.from(await pdf.save());
}
test("50 MB metadata boundary and bounded transfer chunks", () => {
  assert.equal(
    uploadSchema.parse({ name: "impact.pdf", size: MAX_FILE, consent: true })
      .size,
    MAX_FILE,
  );
  assert.equal(
    uploadSchema.safeParse({
      name: "impact.pdf",
      size: MAX_FILE + 1,
      consent: true,
    }).success,
    false,
  );
  assert.equal(
    uploadSchema.safeParse({
      name: "impact.exe",
      size: 12_000_000,
      consent: true,
    }).success,
    false,
  );
  assert.equal(Math.ceil(MAX_FILE / UPLOAD_CHUNK), 17);
});
test(
  "large private upload survives interrupted transfers, rejects foreign access and streams original bytes",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 180000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    process.env.APP_ORIGIN = "https://test.example";
    process.env.REVIEWS_ENABLED = "true";
    const guest = await createGuest(
      new Request("https://test.example/api/visitor", {
        headers: { "x-forwarded-for": randomUUID() },
      }),
    );
    const other = await createGuest(
      new Request("https://test.example/api/visitor", {
        headers: { "x-forwarded-for": randomUUID() },
      }),
    );
    const user = guest.user,
      cookie = guest.cookie!.split(";")[0];
    let reviewId: string | undefined;
    try {
      const bytes = await largePdf();
      assert.ok(bytes.length > 12_000_000 && bytes.length < MAX_FILE);
      await mkdir("artifacts/uploads", { recursive: true });
      await writeFile("artifacts/uploads/large-report.pdf", bytes);
      const upload = await beginUpload(user, {
        name: "large-report.pdf",
        size: bytes.length,
        consent: true,
      });
      await assert.rejects(
        () =>
          storePart(other.user, upload.id, 0, bytes.subarray(0, UPLOAD_CHUNK)),
        { status: 404 },
      );
      await storePart(user, upload.id, 0, bytes.subarray(0, UPLOAD_CHUNK));
      await storePart(user, upload.id, 0, bytes.subarray(0, UPLOAD_CHUNK));
      const corrupted = Buffer.from(bytes.subarray(0, UPLOAD_CHUNK));
      corrupted[10] ^= 1;
      await assert.rejects(() => storePart(user, upload.id, 0, corrupted), {
        status: 409,
      });
      await assert.rejects(
        () =>
          finishUpload(user, upload.id, {
            consent: true,
            qualityConsent: false,
          }),
        { status: 409 },
      );
      for (let i = 1; i < Math.ceil(bytes.length / UPLOAD_CHUNK); i++)
        await storePart(
          user,
          upload.id,
          i,
          bytes.subarray(
            i * UPLOAD_CHUNK,
            Math.min((i + 1) * UPLOAD_CHUNK, bytes.length),
          ),
        );
      const request = (body: Buffer, origin = "https://test.example") =>
        new Request(`https://test.example/api/uploads/${upload.id}?part=0`, {
          method: "PUT",
          headers: { cookie, origin },
          body: new Uint8Array(body),
        });
      assert.equal(
        (
          await putPart(request(Buffer.alloc(UPLOAD_CHUNK + 1)), {
            params: Promise.resolve({ id: upload.id }),
          })
        ).status,
        413,
      );
      assert.equal(
        (
          await putPart(
            request(bytes.subarray(0, UPLOAD_CHUNK), "https://foreign.example"),
            { params: Promise.resolve({ id: upload.id }) },
          )
        ).status,
        403,
      );
      const done = await finishUpload(user, upload.id, {
        consent: true,
        qualityConsent: false,
      });
      reviewId = done.id;
      assert.equal(
        (
          await finishUpload(user, upload.id, {
            consent: true,
            qualityConsent: false,
          })
        ).id,
        done.id,
      );
      assert.equal(
        createHash("sha256")
          .update(await sourceFile(user, done.id))
          .digest("hex"),
        createHash("sha256").update(bytes).digest("hex"),
      );
      assert.equal(
        (
          await query(
            "SELECT part FROM director.upload_parts WHERE upload_id=$1",
            [upload.id],
          )
        ).length,
        0,
      );
      await assert.rejects(() => getReview(other.user, done.id), {
        status: 404,
      });
      const response = await sourceGet(
        new Request(`https://test.example/api/reviews/${done.id}/source`, {
          headers: { cookie },
        }),
        { params: Promise.resolve({ id: done.id }) },
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-length"), null);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
      const expired = await beginUpload(user, {
        name: "expired.pdf",
        size: bytes.length,
        consent: true,
      });
      await query(
        "UPDATE director.uploads SET expires_at=now()-interval '1 second' WHERE id=$1",
        [expired.id],
      );
      await assert.rejects(
        () => storePart(user, expired.id, 0, bytes.subarray(0, UPLOAD_CHUNK)),
        { status: 404 },
      );
      const cancelled = await beginUpload(user, {
        name: "cancelled.pdf",
        size: bytes.length,
        consent: true,
      });
      await discardUpload(user, cancelled.id);
      await assert.rejects(
        () =>
          finishUpload(user, cancelled.id, {
            consent: true,
            qualityConsent: false,
          }),
        { status: 404 },
      );
    } finally {
      if (reviewId) await deleteReview(user, reviewId);
      await query(
        "DELETE FROM director.uploads WHERE owner_id=ANY($1::text[])",
        [[user.id, other.user.id]],
      );
      await query("DELETE FROM director.users WHERE id=ANY($1::text[])", [
        [user.id, other.user.id],
      ]);
      await database().end();
    }
  },
);
