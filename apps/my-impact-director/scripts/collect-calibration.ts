import { readFile, writeFile } from "node:fs/promises";
import { database, query } from "../src/lib/db";
if (
  new URL(process.env.DATABASE_URL || "https://missing").pathname !==
  "/my_impact_director_validation"
)
  throw Error("Validation database only.");
const manifest = JSON.parse(
  await readFile("artifacts/calibration/manifest.json", "utf8"),
);
try {
  for (const fixture of manifest.fixtures) {
    const [row] = await query(
      "SELECT status,stage,error_code,cost_usd,result FROM director.reviews WHERE id=$1",
      [fixture.reviewId],
    );
    if (row) {
      Object.assign(fixture, row);
      await writeFile(
        `artifacts/calibration/${fixture.id}.json`,
        JSON.stringify(fixture, null, 2),
      );
    }
  }
  await writeFile(
    "artifacts/calibration/live-results.json",
    JSON.stringify(manifest, null, 2),
  );
  console.log(
    JSON.stringify(
      manifest.fixtures.map((f: Record<string, unknown>) => ({
        id: f.id,
        status: f.status,
        stage: f.stage,
        error: f.error_code,
        cost: f.cost_usd,
      })),
      null,
      2,
    ),
  );
  const r = await query(
    "SELECT status,stage,error_code,cost_usd FROM director.reviews WHERE id=$1",
    ["17f79bc9-8d09-4606-bbf8-baa1f7d0dfe6"],
  );
  console.log("Genuine report", r);
} finally {
  await database().end();
}
