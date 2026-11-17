import { suppliedPillarSummary } from "./pillar-summary";
import { buildArtResult } from "./art-result";
import { inspectReader, type ReaderInspection } from "./report-reader";
import {
  ART_NOTE,
  isArtDirector,
  inspectArtDirector,
  scoreArtDirector,
  auditArtDirector,
  artObservations,
  type ArtRecord,
  type ArtAudit,
} from "./art-director";
import {
  REPORT_VERSION,
  REPORT_PUBLICATION_NOTICE,
  isReportV2,
  isRevisedReport,
} from "./report-methodology";
import { inspectPdfChecks, type PdfChecks } from "./report-accessibility";
import {
  reportActionsSchema,
  reportActionsFor,
  validateEditorial,
  reportRating,
  visualCoverage,
  actionInstructions,
  type EditorialVerdict,
  type ReportRating,
} from "./report-verdict";
import {
  visualSample,
  normalComparisonPages,
  inspectVisualBatch,
  assessReportPillar,
  type VisualObservation,
} from "./report-visual";
import {
  sourcePassages,
  referencedClaimsSchema,
  referencedFindingsSchema,
  resolveClaims,
  resolveFindings,
} from "./passages";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "./db";
import { recordCompletedReport } from "./review-allowance";
import {
  dailyUsageCost,
  recordUsageCost,
  rateLimit,
  AppError,
} from "./security";
import { structured, AIError, type AIResult } from "./ai";
import { extractPages, readVisualPages, MAX_TEXT } from "./documents";
import {
  contextSchema,
  actionSchema,
  validateClaims,
  validateFindings,
  scoreFramework,
  type Page,
  type Criterion,
  type Claim,
  type Actions,
} from "./assessment";
import {
  ANCHORS,
  VERSION,
  LIMITATION,
  criteria,
  type Framework,
} from "./rubric";
export const STAGES = [
  "Reading the PDF",
  "Reading tables, charts and scans",
  "Understanding the reporting context",
  "Building the material claims register",
  "Claims Code · Evidence",
  "Claims Code · Proportion",
  "Claims Code · Transparency",
  "Claims Code · Balance",
  "Claims Code · Learning",
  "Excellence · Purpose",
  "Excellence · Leadership",
  "Excellence · Data",
  "Excellence · Delivery",
  "Excellence · Communications",
  "Validating findings and preparing your action plan",
  "Review complete",
  "Inspecting rendered page images",
  "The Impact Design Review · Readability and hierarchy",
  "The Impact Design Review · Storytelling",
  "The Impact Design Review · Visual design",
  "The Impact Design Review · Data communication",
  "The Impact Design Review · Accessibility",
  "The Impact Design Review · Whole-document reading exercise",
  "The Impact Design Review · Checking criterion judgements",
  "The Impact Design Review · Applying the five-pillar methodology",
  "The Impact Design Review · Art director consistency review",
  "The Impact Design Review · Saving your editorial review",
];
type Job = {
  created_at: string;
  engine_state: {
    first?: ArtRecord;
    audit?: ArtAudit;
    scoringUsage?: import("./ai").Usage;
  } | null;
  version: string;
  framework: "document" | Framework | null;
  error_code: string | null;
  id: string;
  report_id: string;
  stage: number;
  visual_cursor: number;
  stage_attempts: number;
  attempts: number;
  lease_token: string;
  cost_usd: string;
  context: z.infer<typeof contextSchema> | null;
  claims: Claim[] | null;
  findings: Criterion[];
};
type Document = {
  understanding_context: z.infer<typeof contextSchema> | null;
  understanding_claims: Claim[] | null;
  pages: Page[] | null;
  file_bytes: Buffer;
  title: string;
  extraction_notes: unknown[];
};
export type ReviewResult = {
  displayOverall?: number | null;
  visualFirstImpression?: string;
  artDirector?: ArtRecord;
  assessmentProcess?: {
    promptVersion: string;
    configuration: ArtRecord["configuration"];
    models: string[];
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    modelDurationMs: number;
    elapsedMs: number;
    reexaminedPages: number[];
  };
  publicationNotice?: string;
  materialAccessibilityConcerns?: string[];
  qualityControl?: {
    method: "criterion-execution-audit" | "art-director-consistency-review";
    calculatedOverall?: number | null;
    contradictions?: string[];
    resolutions?: ArtAudit["resolutions"];
    changes: {
      id: string;
      before: number | null;
      after: number | null;
      reason: string;
    }[];
  };
  readerInspection?: ReaderInspection;
  beta?: boolean;
  editorial?: EditorialVerdict;
  rating?: ReportRating;
  pdfChecks?: PdfChecks;
  visualInspection?: {
    pages: number[];
    totalPages: number;
    resolution: number;
    normalComparisonPages?: number[];
    observations: VisualObservation[];
  };
  creativeDirection?: string;
  version: string;
  assessedAt: string;
  context: z.infer<typeof contextSchema>;
  claims: Claim[];
  framework?: Framework;
  scores: Partial<Record<Framework, ReturnType<typeof scoreFramework>>>;
  actions: Actions;
  limitations: string[];
};
export async function processOne(id?: string, latestArtStart?: number) {
  if (process.env.REVIEWS_ENABLED !== "true") return false;
  const [backoff] = await query(
    "SELECT 1 FROM director.rate_limits WHERE key='ai-provider-backoff' AND reset_at>now()",
  );
  if (backoff) return false;
  const token = randomUUID();
  const job = await transaction(async (c) => {
    await c.query(
      "UPDATE director.reviews SET status='failed',error_code='ATTEMPT_LIMIT',error_message='The service could not finish within its processing limits. Please contact us for help.',lease_until=NULL WHERE attempts>=80 AND (status='queued' OR status='running' AND lease_until<now())",
    );
    await c.query(
      `UPDATE director.reviews SET status='failed',error_code='INTERRUPTED',error_message='Processing was interrupted repeatedly. Please retry or contact us.',lease_until=NULL WHERE status='running' AND lease_until<now() AND stage_attempts>=3`,
    );
    const {
      rows: [j],
    } = await c.query<Job>(
      `WITH candidate AS (SELECT id FROM director.reviews WHERE (framework IS NULL OR framework='document' OR EXISTS(SELECT 1 FROM director.reports r WHERE r.id=reviews.report_id AND r.understanding_ready)) AND ($1::uuid IS NULL OR id=$1) AND ($3::timestamptz IS NULL OR NOT(version LIKE '2.1.%' AND stage IN(16,24,25)) OR now()<$3::timestamptz) AND next_attempt_at<=now() AND stage_attempts<3 AND attempts<80 AND (status='queued' OR status='running' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE director.reviews v SET status='running',lease_token=$2,lease_until=now()+interval '4 minutes',stage_attempts=stage_attempts+1,attempts=attempts+1,updated_at=now() FROM candidate c WHERE v.id=c.id RETURNING v.*`,
      [
        id || null,
        token,
        latestArtStart === undefined
          ? null
          : new Date(latestArtStart).toISOString(),
      ],
    );
    return j;
  });
  if (!job) return false;
  const started = Date.now();
  let usage: AIResult<unknown>["usage"] | undefined;
  try {
    if (Number(job.cost_usd) > 4) throw new AIError("REPORT_COST_LIMIT", false);
    if ((await dailyUsageCost()) >= 20)
      throw new AIError("DAILY_COST_LIMIT", false);
    if (job.stage > 0) await rateLimit("ai-stage:global", 240, 86400);
    const [doc] = await query<Document>(
      "SELECT pages,file_bytes,title,extraction_notes,understanding_context,understanding_claims FROM director.reports WHERE id=$1",
      [job.report_id],
    );
    if (!doc) return false;
    let pages = doc.pages,
      notes = doc.extraction_notes,
      context = job.context || doc.understanding_context,
      claims = job.claims || doc.understanding_claims,
      findings = job.findings,
      result: ReviewResult | null = null,
      next = job.stage + 1,
      cursor = job.visual_cursor;
    let engine = job.engine_state || {};
    const art = job.framework === "report" && isArtDirector(job.version);
    const v2 = job.framework === "report" && isReportV2(job.version);
    const visualKind = v2 ? "report-visual-v2" : "report-visual-v1";
    let pdfChecks = notes.find(
      (n) => (n as PdfChecks).kind === "report-pdf-checks-v2",
    ) as PdfChecks | undefined;
    if (art && job.stage === 16) {
      const response = await inspectArtDirector(doc.file_bytes, pages!);
      usage = response.usage;
      engine = { first: response.data };
      next = 24;
    } else if (art && job.stage === 24) {
      if (!engine.first)
        throw Error("Independent art director review is missing");
      const response = await scoreArtDirector(
        doc.file_bytes,
        pages!,
        engine.first,
      );
      usage = response.usage;
      findings = response.data;
      engine = { ...engine, scoringUsage: usage };
      next = 25;
    } else if (art && job.stage === 25) {
      if (!engine.first)
        throw Error("Independent art director review is missing");
      const response = await auditArtDirector(
        doc.file_bytes,
        pages!,
        engine.first,
        findings,
      );
      usage = response.usage;
      findings = response.findings;
      engine = { ...engine, audit: response.data };
      next = 26;
    } else if (art && job.stage === 26) {
      const first = engine.first,
        audit = engine.audit;
      if (!first || !audit || !engine.scoringUsage)
        throw Error("Art director assessment record is incomplete");
      result = buildArtResult(
        pages!,
        context!,
        claims!,
        findings,
        first,
        audit,
        engine.scoringUsage,
        job.created_at,
        job.version,
      );
      next = 15;
    } else if (job.stage === 0) {
      pages = await extractPages(doc.file_bytes);
    } else if (job.stage === 1) {
      const r = await readVisualPages(doc.file_bytes, pages!, cursor);
      usage = r.usage;
      pages = pages!.map((p) => {
        const read = r.data.pages.find((x) => x.page === p.page);
        if (!read) return p;
        return p.readable
          ? {
              ...p,
              text:
                p.text +
                "\n[Additional visual transcription; verify against source]\n" +
                read.text,
              readable: read.readable,
            }
          : read;
      });
      notes = [...notes, ...r.data.observations];
      cursor += r.data.pages.length;
      if (cursor < pages.length) next = 1;
      if (pages.reduce((n, p) => n + p.text.length, 0) > MAX_TEXT * 2)
        throw new AIError("DOCUMENT_TEXT_LIMIT", false);
    } else if (job.stage === 2) {
      const r = await structured(
        contextSchema,
        "Identify the report context from the document. Do not infer unknown identity or period. Use Unknown if identity cannot be established, and null for unknown period. Record unreadable pages and transcription limitations explicitly as limitations of this assessment, never as defects in the original report. Avoid judgements about reporting quality at this context stage.",
        { pages, visualObservations: notes },
      );
      context = r.data;
      usage = r.usage;
    } else if (job.stage === 3) {
      const r = await structured(
        referencedClaimsSchema,
        "Identify and scrutinise all material impact claims, usually 8–12 if the document contains that many, fewer for a short report, up to 40. Never pad the register. Include serious exaggerated or causal claims even if this exceeds the typical number. For each exact claim, retrieve relevant supporting passages from anywhere in the document before judging adequacy. Select the exact source passage ID for each claim and evidenceIds for its support. Choose only IDs from the supplied passages; the server copies their verbatim text. Do not treat a repeated assertion as independent evidence. Participation alone does not establish escape from poverty. Suggest defensible wording only supported by what the report demonstrates. Claim IDs C1, C2 etc.",
        {
          context,
          passages: sourcePassages(pages!),
          visualObservations: notes,
        },
      );
      usage = r.usage;
      claims = validateClaims(
        resolveClaims(r.data, sourcePassages(pages!)),
        pages!,
      );
    } else if (job.framework === "report" && job.stage === 16) {
      const sample = visualSample(pages!, job.version);
      if (v2 && !pdfChecks) {
        pdfChecks = await inspectPdfChecks(doc.file_bytes, sample);
        notes = [...notes, pdfChecks];
      }
      const cached = (notes as VisualObservation[]).filter(
        (n) => n.kind === visualKind,
      );
      const missing = sample.filter((n) => !cached.some((o) => o.page === n));
      if (missing.length) {
        const response = await inspectVisualBatch(
          doc.file_bytes,
          missing.slice(0, 2),
          job.version,
          pdfChecks,
        );
        usage = response.usage;
        notes = [...notes, ...response.data];
        if (missing.length > 2) next = 16;
        else if (isRevisedReport(job.version)) next = 22;
      } else if (isRevisedReport(job.version)) next = 22;
    } else if (job.framework === "report" && job.stage === 22) {
      const r = await inspectReader(
        pages!,
        (notes as VisualObservation[]).filter((n) => n.kind === visualKind),
      );
      usage = r.usage;
      notes = [
        ...notes.filter(
          (n) => (n as ReaderInspection).kind !== "report-reader-2.0.1",
        ),
        r.data,
      ];
      next = 17;
    } else if (
      job.framework === "report" &&
      job.stage >= 17 &&
      job.stage <= 21
    ) {
      const principle = job.stage - 17;
      const response = await assessReportPillar(
        pages!,
        (notes as VisualObservation[]).filter((n) => n.kind === visualKind),
        principle,
        context,
        job.error_code,
        job.version,
        doc.file_bytes,
        pdfChecks,
        notes.find(
          (n) => (n as ReaderInspection).kind === "report-reader-2.0.1",
        ),
      );
      usage = response.usage;
      const validated = validateFindings(
        response.data,
        "report",
        pages!,
        claims!,
        principle,
        job.version,
      );
      findings = [
        ...findings.filter((f) => !validated.some((v) => v.id === f.id)),
        ...validated,
      ];
      if (job.stage === 21) next = isRevisedReport(job.version) ? 23 : 14;
    } else if (job.framework === "report" && job.stage === 23) {
      const before = findings;
      const response = await assessReportPillar(
        pages!,
        (notes as VisualObservation[]).filter((n) => n.kind === visualKind),
        -1,
        context,
        job.error_code,
        job.version,
        doc.file_bytes,
        pdfChecks,
        {
          readingInspection: notes.find(
            (n) => (n as ReaderInspection).kind === "report-reader-2.0.1",
          ),
          initialFindings: findings,
        },
      );
      usage = response.usage;
      findings = validateFindings(
        response.data,
        "report",
        pages!,
        claims!,
        undefined,
        job.version,
      );
      notes = [
        ...notes.filter(
          (n) => (n as { kind: string }).kind !== "report-quality-2.0.1",
        ),
        {
          kind: "report-quality-2.0.1",
          method: "criterion-execution-audit",
          changes: findings
            .filter((f) => before.find((b) => b.id === f.id)?.score !== f.score)
            .map((f) => ({
              id: f.id,
              before: before.find((b) => b.id === f.id)!.score,
              after: f.score,
              reason: f.anchorReason || f.explanation,
            })),
        },
      ];
      next = 14;
    } else if (job.stage >= 4 && job.stage <= 13) {
      const framework: Framework = job.stage < 9 ? "claims" : "excellence",
        principle = (job.stage - 4) % 5;
      const r = await structured(
        referencedFindingsSchema,
        `Assess exactly these four criterion IDs, using the material claims register and the supplied source evidence. Establish evidence before judgement. Select evidenceIds from the supplied source passages. The server copies their exact text and physical page; never invent an ID. Numeric anchors: ${JSON.stringify(ANCHORS)}. 'assessed' needs score 1–4 and cited evidence. 'not_demonstrated' means relevant expected disclosure is absent in a fully readable report; score 0. Never use not_applicable for missing information. 'not_applicable' means genuinely irrelevant, with null score and a contextual explanation. 'unassessable' means insufficient reliable material, with null score and an explanation. If unreadablePages contains ANY page, not_demonstrated is forbidden for every test: an absence cannot be established across the whole report. Use unassessable with null score and a limitation naming the unreadable pages instead. Positive assessed findings still require verified evidence from readable pages. Never penalise the organisation for extraction limitations. Excellence measures report demonstrations, not full organisational maturity. Give specific improvements and confidence. Material claim risks must inform relevant criteria, without mechanical caps. Return no overall score. If previousValidationFailure is UNVERIFIED_QUOTATION, choose only existing passage IDs from the catalogue. If IDs were invalid, copy exactly the supplied criterion and claim IDs.`,
        {
          context,
          criteria: criteria(framework).slice(principle * 4, principle * 4 + 4),
          claims,
          passages: sourcePassages(pages!),
          unreadablePages: pages!.filter((p) => !p.readable).map((p) => p.page),
          visualObservations: notes,
          previousValidationFailure: job.error_code,
          ...(job.stage === 13
            ? {
                visualAssessment:
                  "The original PDF is attached. Inspect its actual layout, charts, tables and labels directly when judging communication and presentation. Incomplete extracted text is a limitation of this assessment and must not reduce the report score.",
              }
            : {}),
        },
        job.stage === 13 ? doc.file_bytes : undefined,
      );
      usage = r.usage;
      const validated = validateFindings(
        resolveFindings(r.data, sourcePassages(pages!)),
        framework,
        pages!,
        claims!,
        principle,
      );
      findings = [
        ...findings.filter((f) => !validated.some((v) => v.id === f.id)),
        ...validated,
      ];
      if (job.framework === "claims" && job.stage === 8) next = 14;
    } else if (job.stage === 14) {
      const scores: ReviewResult["scores"] = {};
      for (const framework of (job.framework
        ? [job.framework]
        : ["claims", "excellence"]) as Framework[]) {
        const checked = validateFindings(
          findings.filter((f) => f.id.startsWith(framework + ".")),
          framework,
          pages!,
          claims!,
          undefined,
          job.version,
        );
        scores[framework] = scoreFramework(
          checked,
          framework,
          undefined,
          job.version,
        );
        if (
          (framework === "report" &&
            !(notes as VisualObservation[]).some(
              (o) => o.kind === visualKind && o.readable,
            )) ||
          (v2 &&
            !visualCoverage(
              pages!,
              notes.filter(
                (n) => (n as VisualObservation).kind === visualKind,
              ) as VisualObservation[],
              job.version,
            ))
        ) {
          delete scores[framework]!.unroundedOverall;
          scores[framework]!.overall = null;
          scores[framework]!.provisional = true;
        }
      }
      const r = await structured(
        v2
          ? isRevisedReport(job.version)
            ? reportActionsFor(
                notes.filter(
                  (n) => (n as VisualObservation).kind === visualKind,
                ) as VisualObservation[],
              )
            : reportActionsSchema
          : actionSchema,
        actionInstructions(job.framework === "report", v2, job.version),
        {
          context,
          claims,
          findings,
          scores,
          ...(v2
            ? {
                visualObservations: notes.filter(
                  (n) => (n as VisualObservation).kind === visualKind,
                ),
                pdfChecks,
                materialAccessibilityConcerns:
                  (
                    notes.find(
                      (n) =>
                        (n as ReaderInspection).kind === "report-reader-2.0.1",
                    ) as ReaderInspection | undefined
                  )?.accessibilityConcerns || [],
                readerInspection: notes.find(
                  (n) => (n as ReaderInspection).kind === "report-reader-2.0.1",
                ),
              }
            : {}),
        },
      );
      usage = r.usage;
      if (
        r.data.actions.some((a) =>
          a.criterionIds.some((id) => !findings.some((f) => f.id === id)),
        )
      )
        throw new Error("Unknown recommendation criterion.");
      const editorial = v2
        ? validateEditorial(
            (r.data as z.infer<typeof reportActionsSchema>).editorial,
            pages!,
            notes.filter(
              (n) => (n as VisualObservation).kind === visualKind,
            ) as VisualObservation[],
          )
        : undefined;
      const calculatedOverall =
        scores.report?.unroundedOverall ?? scores.report?.overall ?? null;
      if (
        isRevisedReport(job.version) &&
        editorial?.scoreConsistency === "review_needed"
      ) {
        delete scores.report!.unroundedOverall;
        scores.report!.overall = null;
        scores.report!.provisional = true;
      }
      if (job.framework === "report" && isRevisedReport(job.version)) {
        delete scores.report!.unroundedOverall;
        scores.report!.overall = null;
        scores.report!.provisional = true;
      }
      for (const score of Object.values(scores))
        for (const p of score!.principles)
          p.summary =
            suppliedPillarSummary(p.name, p.tests, r.data.pillarSummaries) ??
            p.summary;
      result = {
        ...(isRevisedReport(job.version) && job.framework === "report"
          ? {
              beta: true,
              publicationNotice: REPORT_PUBLICATION_NOTICE,
              qualityControl: {
                ...(notes.find(
                  (n) =>
                    (n as { kind: string }).kind === "report-quality-2.0.1",
                ) as NonNullable<ReviewResult["qualityControl"]>),
                calculatedOverall,
              },
              materialAccessibilityConcerns:
                (
                  notes.find(
                    (n) =>
                      (n as ReaderInspection).kind === "report-reader-2.0.1",
                  ) as ReaderInspection | undefined
                )?.accessibilityConcerns || [],
              readerInspection: notes.find(
                (n) => (n as ReaderInspection).kind === "report-reader-2.0.1",
              ) as ReaderInspection | undefined,
            }
          : {}),
        ...(editorial
          ? {
              editorial,
              rating: reportRating(
                scores.report!,
                findings,
                editorial,
                visualCoverage(
                  pages!,
                  notes.filter(
                    (n) => (n as VisualObservation).kind === visualKind,
                  ) as VisualObservation[],
                  job.version,
                ),
                job.version,
              ),
              pdfChecks,
            }
          : {}),
        ...(job.framework && job.framework !== "document"
          ? { framework: job.framework }
          : {}),
        ...(job.framework === "report"
          ? {
              visualInspection: {
                pages: (notes as VisualObservation[])
                  .filter((n) => n.kind === visualKind && (!v2 || n.readable))
                  .map((n) => n.page),
                totalPages: pages!.length,
                resolution: 1600,
                ...(v2 &&
                visualCoverage(
                  pages!,
                  notes.filter(
                    (n) => (n as VisualObservation).kind === visualKind,
                  ) as VisualObservation[],
                  job.version,
                )
                  ? {
                      normalComparisonPages: normalComparisonPages(
                        pages!,
                        notes.filter(
                          (n) => (n as VisualObservation).kind === visualKind,
                        ) as VisualObservation[],
                        pdfChecks,
                      ),
                    }
                  : {}),
                observations: (notes as VisualObservation[]).filter(
                  (n) => n.kind === visualKind,
                ),
              },
              creativeDirection: r.data.actions.find((a) =>
                /creative direction/i.test(a.title),
              )?.detail,
            }
          : {}),
        version:
          job.framework === "report"
            ? job.version.replace(/-report$/, "")
            : VERSION,
        assessedAt: new Date().toISOString(),
        context: context!,
        claims: claims!,
        scores,
        actions: r.data,
        limitations: [
          LIMITATION,
          ...(isRevisedReport(job.version) && job.framework === "report"
            ? [
                "Beta AI-assisted creative assessment; independent human editorial calibration has not been performed. Technical PDF accessibility compliance is not established.",
                REPORT_PUBLICATION_NOTICE,
                ...(editorial?.scoreConsistency === "review_needed"
                  ? [
                      "Editorial quality control identified an unresolved inconsistency in criterion judgements. The overall score is withheld pending reassessment; it has not been arbitrarily adjusted.",
                    ]
                  : []),
              ]
            : []),
          ...(v2 &&
          !visualCoverage(
            pages!,
            notes.filter(
              (n) => (n as VisualObservation).kind === visualKind,
            ) as VisualObservation[],
            job.version,
          )
            ? [
                "Required rendered-page evidence was unavailable or incomplete. No overall score is published. This is an assessment limitation, not evidence of poor report design.",
              ]
            : []),
          "Page references use physical PDF pages. Visual and scanned text is AI-transcribed and may contain errors; check the original source before relying on it.",
          ...context!.limitations,
          ...pages!
            .filter((p) => !p.readable)
            .map((p) => `Page ${p.page} could not be reliably read.`),
        ],
      };
    }
    const ingested = job.framework === "document" && job.stage === 3;
    await transaction(async (c) => {
      const { rowCount } = await c.query(
        "SELECT id FROM director.reviews WHERE id=$1 AND lease_token=$2 AND lease_until>now() FOR UPDATE",
        [job.id, token],
      );
      if (!rowCount) return;
      // Assessment stages read a shared immutable source. Do not write a stale
      // copy of its notes over observations added by another assessment.
      if (job.stage <= 3) {
        await c.query(
          `UPDATE director.reports SET pages=$2,extraction_notes=$3,organisation=COALESCE($4,organisation),reporting_period=COALESCE($5,reporting_period),title=COALESCE($6,title) WHERE id=$1`,
          [
            job.report_id,
            JSON.stringify(pages),
            JSON.stringify(notes),
            context?.organisation,
            context?.reportingPeriod,
            context?.title,
          ],
        );
      } else if (job.framework === "report" && !art) {
        const additions = notes.filter(
          (n) => !doc.extraction_notes.includes(n),
        );
        if (additions.length)
          await c.query(
            `UPDATE director.reports SET extraction_notes=(
          SELECT COALESCE(jsonb_agg(existing.value),'[]'::jsonb)
          FROM jsonb_array_elements(extraction_notes) AS existing(value)
          WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements($2::jsonb) AS added(value)
            WHERE added.value->>'kind'=existing.value->>'kind'
              AND COALESCE(added.value->>'page','')=COALESCE(existing.value->>'page',''))
        ) || $2::jsonb WHERE id=$1`,
            [job.report_id, JSON.stringify(additions)],
          );
      }
      if (ingested)
        await c.query(
          "UPDATE director.reports SET understanding_ready=true,understanding_context=$2,understanding_claims=$3 WHERE id=$1",
          [job.report_id, JSON.stringify(context), JSON.stringify(claims)],
        );
      await c.query(
        `UPDATE director.reviews SET stage=$3,visual_cursor=$4,status=$5,stage_attempts=0,lease_until=NULL,lease_token=NULL,next_attempt_at=now(),context=$6,claims=$7,findings=$8,result=$9,cost_usd=cost_usd+$10,engine_state=$11,error_code=NULL,error_message=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2`,
        [
          job.id,
          token,
          next,
          cursor,
          result || ingested ? "complete" : "queued",
          JSON.stringify(context),
          JSON.stringify(claims),
          JSON.stringify(findings),
          JSON.stringify(result),
          usage?.cost || 0,
          !result && Object.keys(engine).length ? JSON.stringify(engine) : null,
        ],
      );
      if (result) await recordCompletedReport(c, job.report_id);
      if (result)
        await c.query(
          "INSERT INTO director.report_deliveries(review_id,owner_id,email) SELECT $1,owner_id,email FROM director.report_subscriptions WHERE report_id=$2 ON CONFLICT DO NOTHING",
          [job.id, job.report_id],
        );
      if (result)
        await c.query(
          "INSERT INTO director.daily_metrics(event,count) VALUES('review_completed',1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
        );
      await c.query(
        `INSERT INTO director.processing_events(review_id,stage,attempt,status,model,response_id,input_tokens,output_tokens,cost_usd,duration_ms) VALUES($1,$2,$3,'complete',$4,$5,$6,$7,$8,$9)`,
        [
          job.id,
          job.stage,
          job.stage_attempts,
          usage?.model || null,
          usage?.responseId || null,
          usage?.inputTokens || 0,
          usage?.outputTokens || 0,
          usage?.cost || 0,
          Date.now() - started,
        ],
      );
    });
    return true;
  } catch (e) {
    if (e instanceof AIError && e.usage) usage = e.usage;
    const code =
      e instanceof AIError
        ? e.code
        : e instanceof Error && e.name === "ZodError"
          ? "OUTPUT_INVALID"
          : e instanceof Error && e.message.startsWith("Unverified quotation")
            ? "UNVERIFIED_QUOTATION"
            : e instanceof Error &&
                e.message === "Missing or duplicated criteria."
              ? "INVALID_CRITERION_IDS"
              : e instanceof Error && e.message === "Unknown claim reference."
                ? "UNKNOWN_CLAIM_REFERENCE"
                : e instanceof Error &&
                    e.message ===
                      "Missing content prevents reliable absence judgements."
                  ? "UNREADABLE_SOURCE_ABSENCE"
                  : e instanceof Error &&
                      e.message === "Uninspected visual page reference"
                    ? "UNINSPECTED_VISUAL_PAGE"
                    : e instanceof Error &&
                        e.message === "Visual evidence required"
                      ? "VISUAL_EVIDENCE_REQUIRED"
                      : e instanceof Error &&
                          e.message ===
                            "A positive score requires verified evidence."
                        ? "FINDING_EVIDENCE_REQUIRED"
                        : e instanceof Error &&
                            e.message === "An excluded test needs a limitation."
                          ? "EXCLUSION_LIMITATION_REQUIRED"
                          : e instanceof Error &&
                              e.message === "Not demonstrated must score zero."
                            ? "ZERO_STATUS_MISMATCH"
                            : e instanceof Error &&
                                e.message ===
                                  "Excluded tests cannot have scores."
                              ? "EXCLUDED_SCORE_INVALID"
                              : "STAGE_VALIDATION_FAILED";
    const providerWait = e instanceof AIError ? e.retryAfterSeconds : undefined;
    if (providerWait)
      await query(
        "INSERT INTO director.rate_limits(key,count,reset_at) VALUES('ai-provider-backoff',1,now()+make_interval(secs=>$1)) ON CONFLICT(key) DO UPDATE SET reset_at=GREATEST(rate_limits.reset_at,EXCLUDED.reset_at)",
        [providerWait],
      );
    const retry =
      (e instanceof AIError ? e.retryable : !(e instanceof AppError)) &&
      (providerWait ? job.attempts < 80 : job.stage_attempts < 3);
    await query(
      `UPDATE director.reviews SET status=$3,lease_token=NULL,lease_until=NULL,next_attempt_at=now()+make_interval(secs=>$4),error_code=$5,error_message=$6,cost_usd=cost_usd+$7,stage_attempts=GREATEST(0,stage_attempts-$8),updated_at=now() WHERE id=$1 AND lease_token=$2`,
      [
        job.id,
        token,
        retry ? "queued" : "failed",
        retry ? providerWait || 30 * 2 ** job.stage_attempts : 0,
        code,
        retry
          ? "A processing stage needs another attempt. We’ll retry automatically."
          : code === "ART_VISUAL_EVIDENCE_REQUIRED"
            ? "We couldn’t inspect the PDF pages reliably. No editorial scores have been published. Please retry with a readable PDF or contact us for help."
            : "We couldn’t safely complete this review. No scores have been published. Retry or contact us for help.",
        usage?.cost || 0,
        providerWait ? 1 : 0,
      ],
    );
    await query(
      `INSERT INTO director.processing_events(review_id,stage,attempt,status,error_code,duration_ms,cost_usd) VALUES($1,$2,$3,'failed',$4,$5,$6)`,
      [
        job.id,
        job.stage,
        job.stage_attempts,
        code,
        Date.now() - started,
        usage?.cost || 0,
      ],
    );
    return false;
  } finally {
    if (usage) await recordUsageCost(usage.cost);
  }
}
export async function drain(id?: string) {
  const start = Date.now();
  // Art-director requests may use 160 seconds plus rendering/DB work. Never
  // begin another expensive request late in a 300-second function. The next
  // worker resumes the saved stage; other frameworks retain their drain window.
  while (Date.now() - start < 220000) {
    if (!(await processOne(id, start + 100000))) break;
  }
}
