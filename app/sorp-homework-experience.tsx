"use client";

import { useEffect, useState } from "react";
import type { Candidate } from "./sorp-public-model";
import { homeworkMessageAt, homeworkMessages } from "./sorp-homework-timing";

export function SorpHomeworkExperience({ candidate, tier, verified, waiting, startedAt }: { candidate: Candidate | null; tier: string; verified: boolean; waiting: boolean; startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  useEffect(() => {
    if (!waiting) return;
    const update = () => setElapsed(Math.max(0, performance.now() - startedAt));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [waiting, startedAt]);
  const checks: [string, boolean][] = [
    ["Finding the latest published accounts", verified],
    ["Finding the Trustees’ Annual Report", verified],
    ["Confirming the reporting period", Boolean(candidate?.reportPeriod)],
    ["Checking the accounting basis", Boolean(candidate && ["HIGH", "ESTABLISHED"].includes(candidate.accountingBasisConfidence?.toUpperCase()) && ["accruals", "receipts"].includes(candidate.accountingBasis))],
    ["Finding published gross income", candidate?.latestIncome != null],
    ["Checking the SORP reporting context", Boolean(candidate?.entityType === "registered_charity" && candidate?.reportPeriod && candidate?.accountingBasis === "accruals")],
    ["Identifying the SORP 2026 tier", tier !== "Not yet confirmed"],
    ["Matching the relevant reporting requirements", verified && tier !== "Not yet confirmed" && candidate?.entityType === "registered_charity"],
  ];
  const established = checks.map(([, done]) => done).join(",");
  useEffect(() => {
    const next = established.split(",").findIndex((done, index) => done === "true" && !revealed.includes(index));
    if (next < 0 || !waiting) return;
    const timer = window.setTimeout(() => setRevealed(previous => [...previous, next]), 650);
    return () => window.clearTimeout(timer);
  }, [established, revealed, waiting]);
  const pending = checks.map(([, done], index) => !done || waiting && !revealed.includes(index) ? index : -1).filter(index => index >= 0);
  const active = pending[Math.floor(elapsed / 1800) % pending.length];
  const messageIndex = homeworkMessageAt(elapsed).index;
  return <div className="scr-homework-experience">
    <p className="scr-kicker">{waiting ? "BUILDING YOUR HISTORICAL SNAPSHOT…" : verified ? "PUBLIC HOMEWORK COMPLETE ✓" : "PUBLIC HOMEWORK"}</p>
    {waiting ? <div className="scr-homework-messages" aria-live="polite" aria-atomic="true">{homeworkMessages.map((message, index) => <div key={message.title} className={index === messageIndex ? "is-current" : ""} aria-hidden={index !== messageIndex}><h1>{message.title}</h1><p>{message.copy}</p></div>)}</div> : <h1>{verified ? "We found what we need." : "Let’s finish the public homework."}</h1>}
    <ol className="scr-progress-sequence scr-evidence-checklist" aria-label="Public evidence checks">{checks.map(([label, established], index) => {
      const done = established && (!waiting || revealed.includes(index));
      const checking = waiting && !done && active === index;
      return <li key={label} className={done ? "is-complete" : checking ? "is-active" : ""}><span aria-hidden="true">{done ? "✓" : checking ? "→" : "○"}</span><span className="scr-check-label">{label}<small>{done ? "Complete" : checking ? "Checking…" : ""}</small></span></li>;
    })}</ol>
  </div>;
}
