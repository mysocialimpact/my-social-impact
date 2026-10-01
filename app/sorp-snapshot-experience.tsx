"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Presentation timing only. Never marks an assessment operation complete.
export const SNAPSHOT_MINIMUM_MS = 15000;

export function SnapshotBuilding({ verified }: { verified: boolean }) {
  const [message, setMessage] = useState(0);
  useEffect(() => {
    const timers = [window.setTimeout(() => setMessage(1), 7000), window.setTimeout(() => setMessage(2), 11000)];
    return () => timers.forEach(window.clearTimeout);
  }, []);
  const messages = [
    ["SORP 2026 is our source of truth.", "We review your latest Trustees’ Annual Report and accounts against 19 questions mapped to SORP 2026."],
    ["Evidence first. Judgement explained.", "19 questions. Published evidence. Fixed scoring."],
    ["This is the historical view.", "Next, you bring it up to date."],
  ];
  return <section className="hs-building">
    <p className="scr-kicker">BUILDING YOUR HISTORICAL SNAPSHOT…</p>
    <div className="hs-build-message" role="status" aria-live="polite"><h1>{messages[message][0]}</h1><p>{messages[message][1]}</p></div>
    <div className="hs-process" aria-label="From report to evidence, SORP 2026, 19 questions and your Historical Snapshot">
      <svg className="hs-process-desktop" viewBox="0 0 1000 150" fill="none" aria-hidden="true">
        <path className="hs-process-track" d="M80 75 H920" />
        <path className="hs-process-signal" d="M80 75 H920" pathLength="100" />
        <g className="hs-process-symbols">
          <path d="M62 49h25l12 12v42H62z M87 49v14h12 M70 74h20 M70 83h20 M70 92h12" />
          <path d="M270 57h30v36h-30z M278 68h14 M278 76h14 M278 84h8" />
          <circle cx="500" cy="75" r="26"/><path d="m488 75 8 8 17-19" />
          {Array.from({ length: 19 }, (_, i) => <circle key={i} cx={681 + i % 5 * 9} cy={61 + Math.floor(i / 5) * 9} r="2" />)}
          <path d="M894 49h52v52h-52z M903 85v7 M914 75v17 M925 68v24 M936 59v33" />
        </g>
      </svg>
      <svg className="hs-process-mobile" viewBox="0 0 340 260" fill="none" aria-hidden="true">
        <path className="hs-process-track" d="M32 26V234"/>
        <path className="hs-process-signal" d="M32 26V234" pathLength="100"/>
        {["REPORT", "EVIDENCE", "SORP 2026", "19 QUESTIONS", "HISTORICAL SNAPSHOT"].map((label, index) => <g key={label}><circle className="hs-process-symbols" cx="32" cy={26 + index * 52} r="5"/><text x="58" y={31 + index * 52} fill="currentColor">{label}</text></g>)}
      </svg>
      <ol>{["REPORT", "EVIDENCE", "SORP 2026", "19 QUESTIONS", "HISTORICAL SNAPSHOT"].map(label => <li key={label}>{label}</li>)}</ol>
    </div>
    <p className="hs-processing-status">{verified ? "✓ Report read and validated · 19-question assessment returned" : "Preparing the validated assessment"}<br/><span>Assembling your Historical Snapshot.</span></p>
  </section>;
}

export function SnapshotReady() {
  return <section className="hs-ready">
    <p className="hs-done">DONE <span>✓</span></p>
    <h1>YOUR HISTORICAL<br/>SNAPSHOT IS READY.</h1>
    <p>We’ve reviewed your published Trustees’ Annual Report and accounts against SORP 2026.</p>
    <ul><li>19 QUESTIONS ASSESSED</li><li>PUBLISHED EVIDENCE REVIEWED</li><li>SORP REQUIREMENTS MAPPED</li></ul>
  </section>;
}

export function SnapshotMethod({ onMethodology }: { onMethodology: () => void }) {
  return <div className="hs-explainers">
    <details className="scr-details"><summary>HOW DID WE ARRIVE AT THIS? <span>+</span></summary>
      <div className="hs-method"><div><h3>SORP 2026 IS OUR SOURCE OF TRUTH.</h3><p>19 questions. Published evidence. Tier-aware requirements. Fixed scoring. Judgement clearly labelled.</p>
        <div className="hs-human"><Image src="/images/marcus-warry-msi.webp" width={1122} height={1402} sizes="72px" alt="Marcus Warry"/><div><span>METHODOLOGY DEVELOPED BY</span><strong>Marcus Warry ACA</strong><p>Chartered Accountant and social impact consultant</p></div></div>
        <p>The assessment is automated, but the methodology, evidence rules and scoring framework are defined by My Social Impact.</p>
        <button type="button" className="scr-clear" onClick={onMethodology}>VIEW THE FULL METHODOLOGY →</button>
      </div><p className="hs-method-caution">This is an automated readiness assessment based on MSI’s published methodology. It is not an audit or professional assurance opinion. A human should review the underlying evidence and conclusions before relying on them.</p></div>
    </details>
    <details className="scr-details"><summary>WHAT DO MUST / SHOULD / MAY MEAN? <span>+</span></summary><dl className="hs-language"><div><dt>MUST</dt><dd>Required for SORP compliance.</dd></div><div><dt>SHOULD</dt><dd>SORP good practice.</dd></div><div><dt>MAY</dt><dd>Optional / permitted approach.</dd></div></dl></details>
  </div>;
}

/** A single presentation queue: no simultaneous focal animations, no hidden content gates. */
export function SnapshotReveal({ score, children }: { score: number | null; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const number = element.querySelector<HTMLElement>("[data-score]");
    let stopped = false;
    let frame = 0;
    let active: Animation | undefined;
    let observer: IntersectionObserver | undefined;
    const settle = () => { stopped = true; cancelAnimationFrame(frame); active?.cancel(); observer?.disconnect(); if (number) number.textContent = score === null ? "—" : String(score); };
    const reveal = async (target: Element | null) => {
      if (!target || stopped) return;
      active = target.animate([{ opacity: .35, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 380, easing: "ease-out" });
      await active.finished.catch(() => {});
    };
    if (motion.matches) return;
    if (number && score !== null) number.textContent = "0";
    const run = async () => {
      await reveal(element.querySelector("[data-reveal-heading]"));
      if (stopped) return;
      if (number && score !== null) await new Promise<void>(resolve => {
        const start = performance.now();
        const count = (now: number) => {
          if (stopped) { resolve(); return; }
          const fraction = Math.min(1, (now - start) / 900);
          number.textContent = String(Math.round(score * (1 - Math.pow(1 - fraction, 3))));
          if (fraction < 1) frame = requestAnimationFrame(count); else resolve();
        };
        frame = requestAnimationFrame(count);
      });
      await reveal(element.querySelector("[data-reveal-band]"));
      await reveal(element.querySelector("[data-reveal-mandatory]"));
      if (stopped) return;
      const queue: Element[] = [];
      const seen = new WeakSet<Element>();
      let draining = false;
      const drain = async () => { if (draining) return; draining = true; while (queue.length && !stopped) await reveal(queue.shift()!); draining = false; };
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting && !seen.has(entry.target)) { seen.add(entry.target); queue.push(entry.target); observer?.unobserve(entry.target); }
        void drain();
      }, { threshold: .08 });
      element.querySelectorAll("[data-reveal-section]").forEach(target => observer!.observe(target));
    };
    void run();
    motion.addEventListener("change", settle);
    return () => { settle(); motion.removeEventListener("change", settle); };
  }, [score]);
  return <div ref={root} className="scr-quick-result hs-result">{children}</div>;
}
