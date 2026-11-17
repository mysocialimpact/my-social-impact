import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { createGuest } from "../src/lib/access";
import { createReview } from "../src/lib/reviews";
import { selectWorkspace, selectedWorkspace } from "../src/lib/workspace";
import { database, query } from "../src/lib/db";
test(
  "selected report persists for its owner, rejects foreign reports and expires safely",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 60000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    process.env.REVIEWS_ENABLED = "true";
    const guests: Awaited<ReturnType<typeof createGuest>>[] = [];
    try {
      for (let i = 0; i < 2; i++)
        guests.push(
          await createGuest(
            new Request("https://test.example", {
              headers: { "x-forwarded-for": "selection-" + randomUUID() },
            }),
          ),
        );
      const pdf = await PDFDocument.create();
      pdf.addPage().drawText("Private workspace selection fixture.");
      const bytes = Buffer.from(await pdf.save());
      const a = await createReview(
        guests[0].user,
        bytes,
        "first.pdf",
        true,
        false,
        null,
        true,
      );
      const b = await createReview(
        guests[1].user,
        bytes,
        "foreign.pdf",
        true,
        false,
        null,
        true,
      );
      const selected = await selectWorkspace(guests[0].user, a.id);
      assert.equal(
        (await selectedWorkspace({ ...guests[0].user }))?.id,
        selected.id,
      );
      await assert.rejects(
        () => selectWorkspace(guests[0].user, b.id),
        /unavailable/,
      );
      assert.equal((await selectedWorkspace(guests[0].user))?.id, selected.id);
      await query(
        "UPDATE director.reports SET expires_at=now()-interval '1 second' WHERE id=$1",
        [selected.id],
      );
      assert.equal(await selectedWorkspace(guests[0].user), null);
    } finally {
      for (const g of guests) {
        await query("DELETE FROM director.reports WHERE owner_id=$1", [
          g.user.id,
        ]);
        await query("DELETE FROM director.access_sessions WHERE owner_id=$1", [
          g.user.id,
        ]);
        await query("DELETE FROM director.users WHERE id=$1", [g.user.id]);
      }
      await database().end();
    }
  },
);
