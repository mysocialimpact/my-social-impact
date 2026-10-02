"use client";

import { useEffect, useRef } from "react";
import "./sorp-forward-line.css";

const SPEED = 48; // CSS pixels per second, shared by desktop and mobile.
const TRAIL = 52;

/** Decorative continuity, never a percentage or a claim of completed work. */
export function SorpForwardLine({ screen, working = false }: { screen: string; working?: boolean }) {
  const path = useRef<SVGPathElement>(null);
  const shaped = working || ["public-methodology", "intro", "benefits", "homework", "quick-generating", "generating"].includes(screen);
  const route = shaped
    ? "M0 24H190C225 24 235 12 270 12H440C475 12 485 36 520 36H690C725 36 735 24 770 24H1000"
    : "M0 24H1000";
  const labels = screen === "public-methodology" ? ["PUBLISHED REPORT", "19 QUESTIONS", "ASSESSED RESULT"]
    : screen === "intro" ? ["REPORTING REQUIREMENT", "BETTER EVIDENCE", "BETTER IMPACT"]
    : screen === "benefits" ? ["01", "02", "03"]
    : screen === "quick-generating" || screen === "homework" ? ["REPORT", "EVIDENCE", "ASSESSMENT"] : [];

  useEffect(() => {
    const element = path.current;
    if (!element?.ownerSVGElement) return;
    const measure = () => {
      const transform = element.getScreenCTM();
      if (!transform) return;
      const length = element.getTotalLength();
      let previous = element.getPointAtLength(0).matrixTransform(transform);
      let pixels = 0;
      // Measure the displayed curve, including non-uniform responsive scaling.
      for (let i = 1; i <= 160; i++) {
        const next = element.getPointAtLength(length * i / 160).matrixTransform(transform);
        pixels += Math.hypot(next.x - previous.x, next.y - previous.y);
        previous = next;
      }
      if (!pixels) return;
      const trail = TRAIL / pixels * 100;
      element.style.setProperty("--forward-trail", String(trail));
      element.style.setProperty("--forward-end", String(-100 - trail));
      element.style.setProperty("--forward-duration", `${(pixels + TRAIL) / SPEED}s`);
      element.dataset.measured = "true";
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.ownerSVGElement);
    return () => observer.disconnect();
  }, [route]);

  return <div className="scr-forward-line" aria-hidden="true">
    <div className="scr-forward-line-inner">
      <svg viewBox="0 0 1000 48" preserveAspectRatio="none" fill="none">
        <path className="scr-forward-track" d={route} />
        <path ref={path} className="scr-forward-trace" d={route} pathLength="100" />
      </svg>
      {labels.length > 0 && <div className="scr-forward-labels">{labels.map(label => <span key={label}>{label}</span>)}</div>}
    </div>
  </div>;
}
