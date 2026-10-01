"use client";

import { useEffect, useState } from "react";
import type { Candidate } from "./sorp-public-model";
import { homeworkMessageAt, homeworkMessages } from "./sorp-homework-timing";

type StageEvent = { stage: string; message: string; source?: string; httpStatus?: number | null; contentType?: string; createdAt?: string; phase?: "started" | "completed" | "retry" | "failed" | "cache-hit"; durationMs?: number; result?: string; cacheHit?: boolean; ageMs?: number };
const stageThresholds: Record<string, number> = {
  "identity-lookup": 45000, "charity-identity": 60000, "sorp-applicability-tier": 15000,
  "accounts-discovery": 25000, "tar-discovery": 20000, "pdf-download": 25000,
  "content-type-verification": 10000, "pdf-extraction": 95000, "alternative-parser": 95000,
  ocr: 120000, validation: 15000, "requirement-matching": 55000,
  "assessment-handoff": 70000, complete: 15000,
};
const completedEvent = (event: StageEvent) => event.phase === "completed" || event.phase === "cache-hit" || event.cacheHit === true
  || /\b(?:completed|complete|passed|resolved|located|reused|not needed|verified)\b/i.test(event.message);

export function SorpHomeworkExperience({ candidate, tier, verified, waiting, startedAt, sessionId }: { candidate: Candidate | null; tier: string; verified: boolean; waiting: boolean; startedAt: number; sessionId: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [liveEvents, setLiveEvents] = useState<StageEvent[]>([]);
  const [attemptSince] = useState(() => new Date(Date.now() - 2000).toISOString());
  useEffect(() => {
    if (!waiting) return;
    const update = () => setElapsed(Math.max(0, performance.now() - startedAt));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [waiting, startedAt]);
  useEffect(() => {
    if (!waiting || !sessionId) return;
    let active = true;
    const check = async () => {
      try {
        const response = await fetch(`/api/published-review?sessionId=${encodeURIComponent(sessionId)}&since=${encodeURIComponent(attemptSince)}`, { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { events?: StageEvent[] };
        if (active && body.events?.length) {
          const now = Date.now();
          setLiveEvents(body.events.map(event => ({ ...event, ageMs: event.createdAt ? Math.max(0, now - Date.parse(event.createdAt)) : 0 }))
            .sort((left, right) => Date.parse(right.createdAt || "") - Date.parse(left.createdAt || "")));
        }
      } catch { /* The normal progress remains usable if live diagnostics are temporarily unavailable. */ }
    };
    void check();
    const timer = window.setInterval(() => void check(), 1800);
    return () => { active = false; window.clearInterval(timer); };
  }, [waiting, sessionId, attemptSince]);
  const liveStage = liveEvents[0] || null;
  const stageComplete = (stage: string) => liveEvents.some(event => event.stage === stage && completedEvent(event));
  const checks: [string, boolean][] = [
    ["Confirming the charity and reporting context", Boolean(candidate && tier !== "Not yet confirmed") || stageComplete("charity-identity")],
    ["Finding the latest published accounts", stageComplete("accounts-discovery") || verified],
    ["Finding the Trustees’ Annual Report PDF", stageComplete("tar-discovery") || verified],
    ["Downloading and verifying the report file", stageComplete("pdf-download") || verified],
    ["Reading every page of the report", stageComplete("pdf-extraction") || verified],
    ["Validating the complete document", stageComplete("validation") || verified],
    ["Matching evidence to the SORP questions", stageComplete("requirement-matching") || verified],
    ["Completing the source-grounded assessment", stageComplete("complete") || verified],
  ];
  const established = checks.map(([, done]) => done).join(",");
  useEffect(() => {
    const next = established.split(",").findIndex((done, index) => done === "true" && !revealed.includes(index));
    if (next < 0 || !waiting) return;
    const timer = window.setTimeout(() => setRevealed(previous => [...previous, next]), 650);
    return () => window.clearTimeout(timer);
  }, [established, revealed, waiting]);
  const active = Math.max(0, checks.findIndex(([, done]) => !done));
  const messageIndex = homeworkMessageAt(elapsed).index;
  const stageAge = liveStage?.ageMs ?? elapsed;
  const delayThreshold = stageThresholds[liveStage?.stage || ""] || 60000;
  const delayed = waiting && stageAge >= delayThreshold && (!liveStage || !completedEvent(liveStage));
  const continuedDelay = delayed && stageAge >= delayThreshold * 1.6;
  const recovering = liveStage?.phase === "retry" || /\b(?:retry|trying|alternative|next available)\b/i.test(liveStage?.message || "");
  return <div className="scr-homework-experience">
    <p className="scr-kicker">{waiting ? "BUILDING YOUR HISTORICAL SNAPSHOT…" : verified ? "PUBLIC HOMEWORK COMPLETE ✓" : "PUBLIC HOMEWORK"}</p>
    {waiting && verified ? <div className="scr-homework-delay" role="status"><h1>THE FULL REPORT HAS BEEN READ ✓</h1><p>All pages passed the reading and validation checks. We’re completing this screen before you build your Historical Snapshot.</p></div> : waiting && delayed ? <div className="scr-homework-delay" role="status"><h1>{continuedDelay ? "WE’RE STILL WORKING ON IT." : "SORRY — THIS STAGE IS TAKING LONGER THAN NORMAL."}</h1><p><strong>Current stage:</strong> {liveStage?.message || "The current operation has not yet returned a more specific diagnostic result."}</p>{liveStage?.stage && <small>STAGE: {liveStage.stage}{liveStage.httpStatus ? ` · RESPONSE: ${liveStage.httpStatus}` : ""}{liveStage.contentType ? ` · ${liveStage.contentType}` : ""}</small>}<p>{recovering ? "The recovery attempt shown above is in progress. " : "We’re continuing this exact step. "}Your completed checks are saved on this device; no score is produced before full validation.</p></div> : waiting && liveStage ? <div className="scr-homework-delay" role="status"><h1>{liveStage.stage === "identity-lookup" || liveStage.stage === "charity-identity" ? "CONFIRMING THE PUBLIC RECORD…" : "READING THE PUBLISHED EVIDENCE…"}</h1><p>{liveStage.message}</p></div> : waiting ? <div className="scr-homework-messages" aria-live="polite" aria-atomic="true">{homeworkMessages.map((message, index) => <div key={message.title} className={index === messageIndex ? "is-current" : ""} aria-hidden={index !== messageIndex}><h1>{message.title}</h1><p>{message.copy}</p></div>)}</div> : <h1>{verified ? "We found what we need." : "Let’s finish the public homework."}</h1>}
    <ol className="scr-progress-sequence scr-evidence-checklist" aria-label="Public evidence checks">{checks.map(([label, established], index) => {
      const done = established && (!waiting || revealed.includes(index));
      const checking = waiting && !done && active === index;
      return <li key={label} className={done ? "is-complete" : checking ? "is-active" : ""}><span aria-hidden="true">{done ? "✓" : checking ? "→" : "○"}</span><span className="scr-check-label">{label}<small>{done ? "Complete" : checking ? "Checking…" : ""}</small></span></li>;
    })}</ol>
  </div>;
}
