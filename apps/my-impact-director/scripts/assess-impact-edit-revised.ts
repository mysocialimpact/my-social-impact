import { inspectReader } from "../src/lib/report-reader";
/** Paid calibration is opt-in. The default prints a cost/test plan and makes no model requests. */
import fs from "node:fs/promises";
import { modelRates } from "../src/lib/ai";
import path from "node:path";
import { createHash } from "node:crypto";
import { extractPages } from "../src/lib/documents";
import { inspectPdfChecks } from "../src/lib/report-accessibility";
import {
  visualSample,
  normalComparisonPages,
  inspectVisualBatch,
  assessReportPillar,
  type VisualObservation,
} from "../src/lib/report-visual";
import {
  contextSchema,
  actionSchema,
  validateFindings,
  scoreFramework,
} from "../src/lib/assessment";
import { structured } from "../src/lib/ai";
import { REPORT_PUBLICATION_NOTICE } from "../src/lib/report-methodology";
import {
  reportActionsSchema,
  reportActionsFor,
  validateEditorial,
  reportRating,
  visualCoverage,
  actionInstructions,
} from "../src/lib/report-verdict";
import { exportPdf } from "../src/lib/archive/export";
import type { ReviewResult } from "../src/lib/pipeline";
// Historical calibration runner remains pinned to its original process.
const REPORT_VERSION = "2.0.1";
const args = process.argv.slice(2),
  paid = args.includes("--allow-paid"),
  compare = args.includes("--compare-legacy"),
  budget = Number(
    args.find((a) => a.startsWith("--budget-usd="))?.split("=")[1] || 0,
  ),
  baselinePath = args.find((a) => a.startsWith("--baseline-json="))?.slice(16),
  files = args.filter((a) => !a.startsWith("--"));
if (!files.length)
  throw Error(
    "Supply one or more PDFs. Default: plan only. Paid runs require --allow-paid --budget-usd=2.00 after approval.",
  );
const base = baselinePath
  ? JSON.parse(await fs.readFile(baselinePath, "utf8"))
  : null;
const inputs = [];
for (const file of files) {
  const bytes = await fs.readFile(file),
    pages = await extractPages(bytes),
    hash = createHash("sha256").update(bytes).digest("hex");
  inputs.push({
    file,
    bytes,
    pages,
    hash,
    baseline: base?.sha256 === hash ? base.result : null,
  });
}
const model = "openai/gpt-5.4-nano",
  inputRate = 0.0000002,
  outputRate = 0.00000125,
  perCallReserve = 400000 * inputRate + 14000 * outputRate;
const plan = inputs.map((x) => ({
  file: path.basename(x.file),
  pages: x.pages.length,
  newVersion: REPORT_VERSION,
  newCalls: Math.ceil(visualSample(x.pages).length / 2) + 8,
  legacyCalls:
    compare && !x.baseline
      ? Math.ceil(visualSample(x.pages, "1.0.0").length / 2) + 6
      : 0,
  contextCalls: x.baseline ? 0 : 1,
  baseline: x.baseline
    ? "existing stored result, not recomputed"
    : compare
      ? "new v1 model assessment"
      : "none",
}));
console.log(
  JSON.stringify(
    {
      mode: paid ? "approved paid run" : "plan only; no model or email calls",
      model,
      pricesUsdPerMillion: {
        input: Math.round(inputRate * 1e8) / 100,
        output: outputRate * 1e6,
      },
      maximumCostPerCallUsd: perCallReserve,
      proposedHardCapUsd: 2,
      tests: plan,
      emails: 0,
      writesToProduction: 0,
    },
    null,
    2,
  ),
);
if (!paid) process.exit(0);
if (!(budget > 0 && budget <= 2))
  throw Error("Explicit approved --budget-usd must be >0 and <=2.00.");
if (!process.env.OPENAI_API_KEY)
  throw Error(
    "Load the authorised OpenAI project key securely. No credential is printed or provisioned by this script.",
  );
process.env.AI_MODEL = model;
const originalFetch = globalThis.fetch,
  directory =
    process.env.IMPACT_EDIT_CALIBRATION_DIR ||
    "artifacts/assessment-quality/calibration";
await fs.mkdir(directory, { recursive: true });
let accounted = 0;
let ledger: {
  call: number;
  chargedUpperBound: number;
  actualCalculatedUsd?: number;
  status?: number;
}[] = [];
const lock = await fs.open(`${directory}/.budget-lock`, "wx");
try {
  const prior = await fs
    .readFile(`${directory}/cost-ledger.json`, "utf8")
    .catch((e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") return null;
      throw e;
    });
  if (prior) {
    const saved = JSON.parse(prior);
    if (
      saved.budget !== budget ||
      !Number.isFinite(saved.accounted) ||
      !Array.isArray(saved.ledger)
    )
      throw Error(
        "Review the existing approved-budget ledger before changing the test budget.",
      );
    accounted = saved.accounted;
    ledger = saved.ledger;
  }
  const catalogue = await originalFetch("https://api.openai.com/v1/models", {
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  }).then((r) => r.json());
  const listed = catalogue.data?.find(
    (m: { id: string }) => m.id === model.replace(/^openai\//, ""),
  );
  const rates = modelRates(model);
  if (!listed || rates.input !== inputRate || rates.output !== outputRate)
    throw Error(
      "Model or approved rates changed; review the budget before testing.",
    );
  await fs.mkdir(`${directory}/responses`, { recursive: true });
  globalThis.fetch = async (input, init) => {
    if (String(input) !== "https://api.openai.com/v1/chat/completions")
      throw Error(
        "Calibration blocks all other network requests, including email.",
      );
    const payload = String(init?.body),
      cachePath = `${directory}/responses/${createHash("sha256").update(payload).digest("hex")}.json`;
    const cached = await fs
      .readFile(cachePath, "utf8")
      .catch((e: NodeJS.ErrnoException) => {
        if (e.code === "ENOENT") return null;
        throw e;
      });
    if (cached) return Response.json(JSON.parse(cached));
    const body = JSON.parse(payload);
    if (
      body.model !== model.replace(/^openai\//, "") ||
      body.max_completion_tokens !== 14000 ||
      body.tools
    )
      throw Error("Request exceeds approved test configuration.");
    const callInputRate = inputRate,
      callOutputRate = outputRate,
      reserve = perCallReserve;
    if (accounted + reserve > budget + 1e-9)
      throw Error("Approved test budget exhausted; no request sent.");
    accounted += reserve;
    const entry = {
      call: ledger.length + 1,
      chargedUpperBound: reserve,
    } as (typeof ledger)[number];
    ledger.push(entry);
    await fs.writeFile(
      `${directory}/cost-ledger.json`,
      JSON.stringify({ budget, accounted, ledger }, null, 2),
    );
    try {
      const response = await originalFetch(input, init);
      entry.status = response.status;
      const data = await response
        .clone()
        .json()
        .catch(() => null);
      if (
        data?.usage &&
        Number.isFinite(data.usage.prompt_tokens) &&
        Number.isFinite(data.usage.completion_tokens)
      ) {
        const calculated =
          data.usage.prompt_tokens * callInputRate +
          data.usage.completion_tokens * callOutputRate;
        if (calculated > reserve + 1e-9)
          throw Error(
            "Provider usage exceeds catalogue bound; halt for review.",
          );
        accounted += calculated - reserve;
        entry.actualCalculatedUsd = calculated;
        entry.chargedUpperBound = calculated;
      }
      await fs.writeFile(
        `${directory}/cost-ledger.json`,
        JSON.stringify({ budget, accounted, ledger }, null, 2),
      );
      if (response.ok && data)
        await fs.writeFile(cachePath, JSON.stringify(data), { mode: 0o600 });
      return response;
    } catch (error) {
      await fs.writeFile(
        `${directory}/cost-ledger.json`,
        JSON.stringify({ budget, accounted, ledger }, null, 2),
      );
      throw error;
    }
  };
  for (const input of inputs) {
    const slug = path
      .basename(input.file, ".pdf")
      .replace(/[^a-zA-Z0-9_-]/g, "-");
    let context = input.baseline?.context;
    if (!context)
      context = (
        await structured(
          contextSchema,
          "Identify the report context only from supplied source pages. Do not infer unknown organisation or period.",
          { pages: input.pages },
        )
      ).data;
    const outputs: Record<string, ReviewResult> = {};
    if (input.baseline) outputs["1.0.0"] = input.baseline;
    for (const version of compare && !input.baseline
      ? ["1.0.0", REPORT_VERSION]
      : [REPORT_VERSION]) {
      const numbers = visualSample(input.pages, version),
        checks =
          version === REPORT_VERSION
            ? await inspectPdfChecks(input.bytes, numbers)
            : undefined;
      let observations: VisualObservation[] = [];
      for (let i = 0; i < numbers.length; i += 2) {
        const r = await inspectVisualBatch(
          input.bytes,
          numbers.slice(i, i + 2),
          version,
          checks,
        );
        observations.push(...r.data);
      }
      const reader =
        version === REPORT_VERSION
          ? (await inspectReader(input.pages, observations)).data
          : undefined;
      let findings = [] as import("../src/lib/assessment").Criterion[];
      for (let pillar = 0; pillar < 5; pillar++) {
        const r = await assessReportPillar(
          input.pages,
          observations,
          pillar,
          context,
          null,
          version,
          input.bytes,
          checks,
          reader,
        );
        findings.push(
          ...validateFindings(
            r.data,
            "report",
            input.pages,
            [],
            pillar,
            version,
          ),
        );
      }
      const initialFindings = findings;
      if (version === REPORT_VERSION) {
        const audited = await assessReportPillar(
          input.pages,
          observations,
          -1,
          context,
          null,
          version,
          input.bytes,
          checks,
          { readingInspection: reader, initialFindings },
        );
        findings = validateFindings(
          audited.data,
          "report",
          input.pages,
          [],
          undefined,
          version,
        );
      }
      const qualityControl = {
        method: "criterion-execution-audit" as const,
        changes: findings
          .filter(
            (f) =>
              initialFindings.find((b) => b.id === f.id)?.score !== f.score,
          )
          .map((f) => ({
            id: f.id,
            before: initialFindings.find((b) => b.id === f.id)!.score,
            after: f.score,
            reason: f.anchorReason || f.explanation,
          })),
      };
      const score = scoreFramework(findings, "report", undefined, version);
      if (
        !visualCoverage(input.pages, observations) &&
        version === REPORT_VERSION
      ) {
        score.overall = null;
        score.provisional = true;
      }
      const actionResult = await structured(
        version === REPORT_VERSION
          ? reportActionsFor(observations)
          : actionSchema,
        actionInstructions(true, version === REPORT_VERSION, version),
        {
          context,
          claims: [],
          findings,
          scores: { report: score },
          visualObservations: observations,
          pdfChecks: checks,
          readerInspection: reader,
          materialAccessibilityConcerns: reader?.accessibilityConcerns || [],
        },
      );
      if (
        actionResult.data.actions.some((a) =>
          a.criterionIds.some((id) => !findings.some((f) => f.id === id)),
        )
      )
        throw Error("Unknown action criterion.");
      const editorial =
        version === REPORT_VERSION
          ? validateEditorial(
              (
                actionResult.data as import("zod").infer<
                  typeof reportActionsSchema
                >
              ).editorial,
              input.pages,
              observations,
            )
          : undefined;
      const calculatedOverall = score.overall;
      if (editorial?.scoreConsistency === "review_needed") {
        score.overall = null;
        score.provisional = true;
      }
      score.overall = null;
      score.provisional = true;
      const result: ReviewResult = {
        publicationNotice: REPORT_PUBLICATION_NOTICE,
        beta: true,
        qualityControl: { ...qualityControl, calculatedOverall },
        readerInspection: reader,
        materialAccessibilityConcerns: reader?.accessibilityConcerns || [],
        framework: "report",
        version,
        assessedAt: new Date().toISOString(),
        context,
        claims: [],
        scores: { report: score },
        actions: actionResult.data,
        limitations: [
          "Calibration assessment, not independent human validation.",
          ...(checks?.notVerified || []),
        ],
        visualInspection: {
          pages: numbers,
          totalPages: input.pages.length,
          resolution: 1600,
          ...(version === REPORT_VERSION &&
          visualCoverage(input.pages, observations)
            ? {
                normalComparisonPages: normalComparisonPages(
                  input.pages,
                  observations,
                  checks,
                ),
              }
            : {}),
          observations,
        },
        ...(editorial
          ? {
              editorial,
              rating: reportRating(
                score,
                findings,
                editorial,
                visualCoverage(input.pages, observations),
                version,
              ),
              pdfChecks: checks,
            }
          : {}),
      };
      outputs[version] = result;
      await fs.writeFile(
        `${directory}/${slug}-v${version}.json`,
        JSON.stringify({ sha256: input.hash, result }, null, 2),
      );
      await fs.writeFile(
        `${directory}/${slug}-v${version}.pdf`,
        await exportPdf(result),
      );
      console.log({
        report: slug,
        version,
        overall: score.overall,
        pillars: score.principles.map((p) => ({
          name: p.name,
          score: p.score,
          maximum: p.maximum,
        })),
        accountedUsd: accounted,
      });
    }
    await fs.writeFile(
      `${directory}/${slug}-comparison.json`,
      JSON.stringify(outputs, null, 2),
    );
  }
} finally {
  globalThis.fetch = originalFetch;
  await lock.close();
  await fs.unlink(`${directory}/.budget-lock`);
}
