/** Offline comparison runner. Authorised OpenAI project key only; no emails or production writes. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { extractPages } from "../src/lib/documents";
import {
  inspectArtDirector,
  scoreArtDirector,
  auditArtDirector,
  artConfiguration,
  clearArtRenderCache,
} from "../src/lib/art-director";
import { buildArtResult } from "../src/lib/art-result";
import { modelRates } from "../src/lib/ai";
import { exportPdf } from "../src/lib/archive/export";
const args = process.argv.slice(2),
  run = args.includes("--allow-paid"),
  budget = Number(
    args.find((a) => a.startsWith("--budget-usd="))?.slice(13) || 0,
  ),
  out =
    args.find((a) => a.startsWith("--output="))?.slice(9) ||
    "artifacts/art-director-runs",
  files = args.filter((a) => !a.startsWith("--"));
if (!files.length)
  throw Error(
    "Supply PDF paths. Default is plan-only; real calls require --allow-paid --budget-usd=5.",
  );
const inputs = [];
for (const file of files) {
  const bytes = await fs.readFile(file),
    pages = await extractPages(bytes);
  inputs.push({
    file,
    bytes,
    pages,
    hash: createHash("sha256").update(bytes).digest("hex"),
  });
}
console.log(
  JSON.stringify(
    {
      mode: run
        ? "Requested real-document calibration"
        : "Plan only; no AI requests",
      configuration: artConfiguration(),
      documents: inputs.map((x) => ({
        file: path.basename(x.file),
        pages: x.pages.length,
        sha256: x.hash,
      })),
      budgetUsd: budget || null,
      emails: 0,
      productionWrites: 0,
    },
    null,
    2,
  ),
);
if (!run) process.exit(0);
if (!(budget > 0 && budget <= 5))
  throw Error(
    "Choose an explicit calibration budget greater than zero and no more than US$5.",
  );
if (!process.env.OPENAI_API_KEY)
  throw Error("An authorised OpenAI project key is required.");
await fs.mkdir(out, { recursive: true });
const lock = await fs.open(path.join(out, ".lock"), "wx"),
  native = globalThis.fetch;
type Ledger = {
  budget: number;
  accounted: number;
  calls: {
    digest: string;
    model: string;
    reserved: number;
    estimatedActual?: number;
    status?: number;
  }[];
};
const ledgerPath = path.join(out, "cost-ledger.json");
let ledger: Ledger;
try {
  ledger = JSON.parse(await fs.readFile(ledgerPath, "utf8"));
  if (ledger.budget !== budget)
    throw Error(
      "Review the previous ledger before changing this run's budget.",
    );
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
    await lock.close();
    await fs.unlink(path.join(out, ".lock"));
    throw e;
  }
  ledger = { budget, accounted: 0, calls: [] };
}
async function save() {
  await fs.writeFile(ledgerPath, JSON.stringify(ledger, null, 2), {
    mode: 0o600,
  });
}
globalThis.fetch = async (input, init) => {
  if (String(input) !== "https://api.openai.com/v1/chat/completions")
    return native(input, init);
  const bodyText = String(init?.body),
    body = JSON.parse(bodyText),
    digest = createHash("sha256").update(bodyText).digest("hex"),
    cache = path.join(out, digest + ".response.json");
  try {
    const response = JSON.parse(await fs.readFile(cache, "utf8"));
    return Response.json(response.data, { status: response.status });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const rates = modelRates(body.model),
    parts = body.messages.flatMap((m: { content: unknown }) =>
      Array.isArray(m.content)
        ? m.content
        : [{ type: "text", text: String(m.content) }],
    ),
    images = parts.filter(
      (p: { type: string }) => p.type === "image_url",
    ).length,
    textBytes =
      Buffer.byteLength(JSON.stringify(body.response_format)) +
      parts
        .filter((p: { type: string }) => p.type === "text")
        .reduce(
          (n: number, p: { text: string }) => n + Buffer.byteLength(p.text),
          0,
        ),
    inputEstimate = textBytes + 8192 * images;
  const reservation =
    inputEstimate * rates.input * (inputEstimate > 272000 ? 2 : 1) +
    Number(body.max_completion_tokens) *
      rates.output *
      (inputEstimate > 272000 ? 1.5 : 1);
  if (ledger.accounted + reservation > budget)
    throw Error(
      "Calibration stopped before its next conservative token reservation exceeded the configured budget.",
    );
  ledger.accounted += reservation;
  const entry = {
    digest,
    model: body.model,
    reserved: reservation,
  } as Ledger["calls"][number];
  ledger.calls.push(entry);
  await save();
  const response = await native(input, init),
    data = await response.json();
  entry.status = response.status;
  if (
    Number.isFinite(data.usage?.prompt_tokens) &&
    Number.isFinite(data.usage?.completion_tokens)
  ) {
    const it = data.usage.prompt_tokens,
      ot = data.usage.completion_tokens;
    entry.estimatedActual =
      it * rates.input * (it > 272000 ? 2 : 1) +
      ot * rates.output * (it > 272000 ? 1.5 : 1);
    ledger.accounted += entry.estimatedActual - reservation;
  }
  await save();
  if (response.ok && data.usage)
    await fs.writeFile(
      cache,
      JSON.stringify({ status: response.status, data }),
      { mode: 0o600 },
    );
  return Response.json(data, { status: response.status });
};
try {
  for (const x of inputs) {
    const started = new Date().toISOString(),
      first = await inspectArtDirector(x.bytes, x.pages),
      scoring = await scoreArtDirector(x.bytes, x.pages, first.data),
      audit = await auditArtDirector(
        x.bytes,
        x.pages,
        first.data,
        scoring.data,
      ),
      context = {
        organisation: "Not identified by this offline comparison",
        title: path.basename(x.file),
        reportingPeriod: null,
        beneficiaries: [],
        activities: [],
        outcomes: [],
        context: "Offline source-document editorial comparison.",
        limitations: [
          "No independent human professional calibration has been claimed.",
        ],
      },
      result = buildArtResult(
        x.pages,
        context,
        [],
        audit.findings,
        first.data,
        audit.data,
        scoring.usage,
        started,
      ),
      name =
        path.basename(x.file).replace(/[^A-Za-z0-9_.-]/g, "-") +
        "-" +
        x.hash.slice(0, 10);
    await fs.writeFile(
      path.join(out, name + ".json"),
      JSON.stringify({ sha256: x.hash, result }, null, 2),
      { mode: 0o600 },
    );
    await fs.writeFile(path.join(out, name + ".pdf"), await exportPdf(result));
    console.log(
      JSON.stringify({
        file: path.basename(x.file),
        version: result.version,
        coverage: result.visualInspection?.pages.length,
        overallPublished: result.scores.report?.overall !== null,
        estimatedEngineCostUsd: result.assessmentProcess?.estimatedCostUsd,
      }),
    );
    clearArtRenderCache();
  }
} finally {
  globalThis.fetch = native;
  await save();
  await lock.close();
  await fs.unlink(path.join(out, ".lock"));
}
