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
          // Status responses are a rolling window. Keep confirmed UI evidence from
          // earlier polls in this attempt rather than turning completed checks grey again.
          setLiveEvents(previous => Array.from(new Map([...previous, ...body.events!]
            .map(event => [`${event.stage}:${event.createdAt}:${event.message}`, event])).values())
            .map(event => ({ ...event, ageMs: event.createdAt ? Math.max(0, now - Date.parse(event.createdAt)) : 0 }))
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
    ["Matching the relevant SORP requirements", stageComplete("requirement-matching") || verified],
    ["Assessing published evidence against our 19 questions", stageComplete("complete") || verified],
    ["Confirming the reporting period", Boolean(candidate?.reportPeriod)],
    ["Checking your SORP 2026 tier", Boolean(candidate && tier !== "Not yet confirmed")],
  ];
  const messageIndex = homeworkMessageAt(elapsed).index;
  const stageAge = liveStage?.ageMs ?? elapsed;
  const delayThreshold = stageThresholds[liveStage?.stage || ""] || 60000;
  const delayed = waiting && stageAge >= delayThreshold && (!liveStage || !completedEvent(liveStage));
  const continuedDelay = delayed && stageAge >= delayThreshold * 1.6;
  const recovering = liveStage?.phase === "retry" || /\b(?:retry|trying|alternative|next available)\b/i.test(liveStage?.message || "");
  // Presentation groups only: ticks still come from the existing diagnostics / validation gate.
  const groups = [
    { name: "Document", stages: ["accounts-discovery", "tar-discovery", "pdf-download", "content-type-verification"], checks: [1, 2, 3] },
    { name: "Evidence", stages: ["pdf-extraction", "alternative-parser", "ocr", "validation"], checks: [4, 5] },
    { name: "SORP", stages: ["identity-lookup", "charity-identity", "sorp-applicability-tier", "requirement-matching"], checks: [0, 8, 9, 6] },
    { name: "Assessment", stages: ["assessment-handoff", "complete"], checks: [7] },
  ];
  const liveGroup = liveStage ? groups.findIndex(group => group.stages.includes(liveStage.stage)) : 0;
  return <div className="scr-homework-experience">
    <p className="scr-kicker">{waiting ? "PUBLIC HOMEWORK / BUILDING YOUR HISTORICAL SNAPSHOT" : verified ? "PUBLIC HOMEWORK COMPLETE ✓" : "PUBLIC HOMEWORK"}</p>
    {waiting && !verified && delayed ? <div className="scr-homework-delay" role="status"><h1>{continuedDelay ? "WE’RE STILL WORKING ON IT." : "SORRY — THIS STAGE IS TAKING LONGER THAN NORMAL."}</h1><p><strong>Current stage:</strong> {liveStage?.message || "The current operation has not yet returned a more specific diagnostic result."}</p>{liveStage?.stage && <small>STAGE: {liveStage.stage}{liveStage.httpStatus ? ` · RESPONSE: ${liveStage.httpStatus}` : ""}{liveStage.contentType ? ` · ${liveStage.contentType}` : ""}</small>}<p>{recovering ? "The recovery attempt shown above is in progress. " : "We’re continuing this exact step. "}Your completed checks are saved on this device; no score is produced before full validation.</p></div> : <header className="sh-heading">
      <h1>{waiting ? "We’re doing the homework." : verified ? "We found what we need." : "Let’s finish the public homework."}</h1>
      {waiting && <p>We’re finding your latest published reporting, reading it properly and applying our SORP 2026 methodology.</p>}
    </header>}
    {waiting && <>
      <ol className="sh-process" aria-label="Public Homework progress">
        {groups.map((group, index) => {
          const done = group.checks.every(check => checks[check][1]);
          const active = !verified && !done && liveGroup === index;
          return <li key={group.name} className={done ? "is-complete" : active ? "is-active" : ""}>
            <div className="sh-station"><span className="sh-number">0{index + 1}</span><HomeworkMotif index={index} /><span className="sh-state" aria-label={done ? "Complete" : active ? "In progress" : "Waiting"}>{done ? "✓" : active ? "●" : "○"}</span></div>
            <h2>{group.name}</h2>
            <ul>{group.checks.map(check => <li key={checks[check][0]} className={checks[check][1] ? "is-complete" : ""}><span aria-hidden="true">{checks[check][1] ? "✓" : "—"}</span>{checks[check][0]}</li>)}</ul>
          </li>;
        })}
      </ol>
      {verified && <p className="sh-verified" role="status">✓ The full report has been read and validated. Your Historical Snapshot assessment is ready.</p>}
      {!delayed && <div className="sh-trust" aria-live="polite" aria-atomic="true">{homeworkMessages.map((message, index) => <p key={message.title} className={index === messageIndex ? "is-current" : ""} aria-hidden={index !== messageIndex}>{message.title}</p>)}</div>}
    </>}
  </div>;
}

function HomeworkMotif({ index }: { index: number }) {
  return <svg className="sh-motif" viewBox="0 0 200 150" fill="none" aria-hidden="true">
    {index === 0 ? <>
      <path className="sh-quiet" d="M57 31V14h85l20 20v99h-17M42 22h83l21 22v97H42Z" />
      <path d="M125 22v23h21M60 68h66M60 81h66M60 94h47M60 116h66" />
      <path className="sh-scan" d="M34 52h120" />
    </> : index === 1 ? <>
      <path className="sh-quiet" d="M33 48 97 27 166 51 147 114 65 129 33 48 147 114 97 27 65 129 166 51M33 48l62 34 71-31M95 82l52 32" />
      {[[33,48],[97,27],[166,51],[147,114],[65,129]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="5" />)}
      <circle className="sh-pulse" cx="95" cy="82" r="20" /><circle cx="95" cy="82" r="7" />
    </> : index === 2 ? <>
      <path className="sh-quiet" d="M24 35h152M24 75h152M24 115h152M57 15v120M142 15v120" />
      <path d="M37 25v20M27 35h20M100 65v20M90 75h20M163 105v20M153 115h20" />
      <path className="sh-reference" pathLength="100" d="M37 35h63v40h63v40" />
      <circle cx="37" cy="35" r="11" /><circle cx="100" cy="75" r="11" /><circle cx="163" cy="115" r="11" />
    </> : <>
      <path className="sh-quiet" d="M48 18h104v119H48ZM66 52h39M66 73h62M66 94h50" />
      <circle cx="137" cy="112" r="25" /><path className="sh-result" pathLength="100" d="m125 112 9 9 16-19" />
      <path d="M66 32h57" />
    </>}
  </svg>;
}
