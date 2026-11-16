import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { PDFDocument, StandardFonts } from "pdf-lib";
test("calibration defaults to no model calls and preserves a total budget across restarts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mid-calibration-"));
  try {
    const pdf = await PDFDocument.create(),
      font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf
      .addPage()
      .drawText(
        "An offline budget guard fixture. No actual model calls are permitted.",
        { x: 30, y: 700, size: 12, font },
      );
    const file = join(dir, "fixture.pdf");
    await writeFile(file, await pdf.save());
    const hook = join(dir, "network.mjs");
    await writeFile(
      hook,
      `globalThis.fetch=async input=>{if(String(input)==='https://ai-gateway.vercel.sh/v1/models')return Response.json({data:[{id:'openai/gpt-5.4-nano',context_window:400000,pricing:{input:'0.0000002',output:'0.00000125'}}]});throw Error('MODEL_CALL_ESCAPED_BUDGET_GUARD');};`,
    );
    const run = (args: string[]) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--import",
          hook,
          "scripts/assess-impact-edit.ts",
          ...args,
          file,
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            AI_GATEWAY_API_KEY: "synthetic-no-network",
            IMPACT_EDIT_CALIBRATION_DIR: join(dir, "paid"),
          },
          encoding: "utf8",
          timeout: 30000,
        },
      );
    const plan = run([]);
    assert.equal(plan.status, 0);
    assert.match(plan.stdout, /plan only; no model or email calls/);
    const low = run(["--allow-paid", "--budget-usd=0.05"]);
    assert.notEqual(low.status, 0);
    assert.match(low.stderr, /Approved test budget exhausted/);
    assert.doesNotMatch(low.stderr, /MODEL_CALL_ESCAPED/);
    await mkdir(join(dir, "paid"), { recursive: true });
    await writeFile(
      join(dir, "paid", "cost-ledger.json"),
      JSON.stringify({ budget: 2, accounted: 1.95, ledger: [] }),
    );
    const resumed = run(["--allow-paid", "--budget-usd=2.00"]);
    assert.match(resumed.stderr, /Approved test budget exhausted/);
    assert.doesNotMatch(resumed.stderr, /MODEL_CALL_ESCAPED/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
