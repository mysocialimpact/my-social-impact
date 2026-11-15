import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "./db";
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
  claimsSchema,
  findingsSchema,
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
];
type Job = {
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
  pages: Page[] | null;
  file_bytes: Buffer;
  title: string;
  extraction_notes: unknown[];
};
export type ReviewResult = {
  version: string;
  assessedAt: string;
  context: z.infer<typeof contextSchema>;
  claims: Claim[];
  scores: {
    claims: ReturnType<typeof scoreFramework>;
    excellence: ReturnType<typeof scoreFramework>;
  };
  actions: Actions;
  limitations: string[];
};
export async function processOne(id?: string) {
  if (process.env.REVIEWS_ENABLED !== "true") return false;
  const token = randomUUID();
  const job = await transaction(async (c) => {
    await c.query(
      `UPDATE director.reviews SET status='failed',error_code='INTERRUPTED',error_message='Processing was interrupted repeatedly. Please retry or contact us.',lease_until=NULL WHERE status='running' AND lease_until<now() AND stage_attempts>=3`,
    );
    const {
      rows: [j],
    } = await c.query<Job>(
      `WITH candidate AS (SELECT id FROM director.reviews WHERE ($1::uuid IS NULL OR id=$1) AND next_attempt_at<=now() AND stage_attempts<3 AND (status='queued' OR status='running' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE director.reviews v SET status='running',lease_token=$2,lease_until=now()+interval '4 minutes',stage_attempts=stage_attempts+1,attempts=attempts+1,updated_at=now() FROM candidate c WHERE v.id=c.id RETURNING v.*`,
      [id || null, token],
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
      "SELECT pages,file_bytes,title,extraction_notes FROM director.reports WHERE id=$1",
      [job.report_id],
    );
    if (!doc) return false;
    let pages = doc.pages,
      notes = doc.extraction_notes,
      context = job.context,
      claims = job.claims,
      findings = job.findings,
      result: ReviewResult | null = null,
      next = job.stage + 1,
      cursor = job.visual_cursor;
    if (job.stage === 0) {
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
        "Identify the report context from the document. Do not infer unknown identity or period. Use Unknown if identity cannot be established, and null for unknown period. Explain unreadable pages and transcription limitations.",
        { pages, visualObservations: notes },
      );
      context = r.data;
      usage = r.usage;
    } else if (job.stage === 3) {
      const r = await structured(
        claimsSchema,
        "Identify and scrutinise all material impact claims, usually 8–12 if the document contains that many, fewer for a short report, up to 40. Never pad the register. Include serious exaggerated or causal claims even if this exceeds the typical number. For each exact claim, retrieve relevant supporting passages from anywhere in the document before judging adequacy. Claim text must be a verbatim passage at least 12 characters long. Do not treat a repeated assertion as independent evidence. Participation alone does not establish escape from poverty. Suggest defensible wording only supported by what the report demonstrates. Claim IDs C1, C2 etc.",
        { context, pages, visualObservations: notes },
      );
      usage = r.usage;
      claims = validateClaims(r.data, pages!);
    } else if (job.stage >= 4 && job.stage <= 13) {
      const framework: Framework = job.stage < 9 ? "claims" : "excellence",
        principle = (job.stage - 4) % 5;
      const r = await structured(
        findingsSchema,
        `Assess exactly these four criterion IDs, using the material claims register and the supplied source evidence. Establish evidence before judgement. Cite exact source passages. Numeric anchors: ${JSON.stringify(ANCHORS)}. 'assessed' needs score 1–4 and cited evidence. 'not_demonstrated' means relevant expected disclosure is absent in a fully readable report; score 0. Never use not_applicable for missing information. 'not_applicable' means genuinely irrelevant, with null score and a contextual explanation. 'unassessable' means insufficient reliable material, with null score and an explanation. Do not use absence judgements where pages are unreadable. Excellence measures report demonstrations, not full organisational maturity. Give specific improvements and confidence. Material claim risks must inform relevant criteria, without mechanical caps. Return no overall score.`,
        {
          context,
          criteria: criteria(framework).slice(principle * 4, principle * 4 + 4),
          claims,
          pages,
          visualObservations: notes,
        },
      );
      usage = r.usage;
      const validated = validateFindings(
        r.data.findings,
        framework,
        pages!,
        claims!,
        principle,
      );
      findings = [
        ...findings.filter((f) => !validated.some((v) => v.id === f.id)),
        ...validated,
      ];
    } else if (job.stage === 14) {
      const cf = validateFindings(
        findings.filter((f) => f.id.startsWith("claims.")),
        "claims",
        pages!,
        claims!,
      );
      const ef = validateFindings(
        findings.filter((f) => f.id.startsWith("excellence.")),
        "excellence",
        pages!,
        claims!,
      );
      const scores = {
        claims: scoreFramework(cf, "claims"),
        excellence: scoreFramework(ef, "excellence"),
      };
      const r = await structured(
        actionSchema,
        "Write a concise executive summary and specific prioritised action plan using ONLY validated findings. Each action must cite existing criterion IDs and say what to change, why, and how. Distinguish quick wording changes, important evidence/reporting improvements, and longer-term measurement/management improvements. Do not invent achievements, comparisons, benchmarks or new source facts. If evidence is weak, a strength may be a clearly qualified useful starting point. Do not describe provisional assessments as definitive scores.",
        { context, claims, findings, scores },
      );
      usage = r.usage;
      if (
        r.data.actions.some((a) =>
          a.criterionIds.some((id) => !findings.some((f) => f.id === id)),
        )
      )
        throw new Error("Unknown recommendation criterion.");
      result = {
        version: VERSION,
        assessedAt: new Date().toISOString(),
        context: context!,
        claims: claims!,
        scores,
        actions: r.data,
        limitations: [
          LIMITATION,
          "Page references use physical PDF pages. Visual and scanned text is AI-transcribed and may contain errors; check the original source before relying on it.",
          ...context!.limitations,
          ...pages!
            .filter((p) => !p.readable)
            .map((p) => `Page ${p.page} could not be reliably read.`),
        ],
      };
    }
    await transaction(async (c) => {
      const { rowCount } = await c.query(
        "SELECT id FROM director.reviews WHERE id=$1 AND lease_token=$2 AND lease_until>now() FOR UPDATE",
        [job.id, token],
      );
      if (!rowCount) return;
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
      await c.query(
        `UPDATE director.reviews SET stage=$3,visual_cursor=$4,status=$5,stage_attempts=0,lease_until=NULL,lease_token=NULL,next_attempt_at=now(),context=$6,claims=$7,findings=$8,result=$9,cost_usd=cost_usd+$10,error_code=NULL,error_message=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2`,
        [
          job.id,
          token,
          next,
          cursor,
          result ? "complete" : "queued",
          JSON.stringify(context),
          JSON.stringify(claims),
          JSON.stringify(findings),
          JSON.stringify(result),
          usage?.cost || 0,
        ],
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
    const code =
      e instanceof AIError
        ? e.code
        : e instanceof Error && e.name === "ZodError"
          ? "OUTPUT_INVALID"
          : "STAGE_VALIDATION_FAILED";
    const retry =
      (e instanceof AIError ? e.retryable : !(e instanceof AppError)) &&
      job.stage_attempts < 3;
    await query(
      `UPDATE director.reviews SET status=$3,lease_token=NULL,lease_until=NULL,next_attempt_at=now()+make_interval(secs=>$4),error_code=$5,error_message=$6,cost_usd=cost_usd+$7,updated_at=now() WHERE id=$1 AND lease_token=$2`,
      [
        job.id,
        token,
        retry ? "queued" : "failed",
        retry ? 30 * 2 ** job.stage_attempts : 0,
        code,
        retry
          ? "A processing stage needs another attempt. We’ll retry automatically."
          : "We couldn’t safely complete this review. No scores have been published. Retry or contact us for help.",
        usage?.cost || 0,
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
  while (Date.now() - start < 220000) {
    if (!(await processOne(id))) break;
  }
}
