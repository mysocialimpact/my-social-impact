"use client";

import { useEffect, useRef } from "react";
import "./sorp-forward-line.css";

const SPEED = 48; // CSS pixels per second, shared by desktop and mobile.

/** Decorative continuity, never a percentage or a claim of completed work. */
export function SorpForwardLine({ screen, working = false }: { screen: string; working?: boolean }) {
  const path = useRef<SVGPathElement>(null);
  const benefits = screen === "benefits";
  const editorial = ["public-methodology", "intro"].includes(screen);
  const shaped = working || ["homework", "quick-generating", "generating"].includes(screen);
  const route = benefits || editorial ? "M60 58H195C280 58 260 114 350 114H525C610 114 590 170 680 170H920" : shaped
    ? "M0 24H190C225 24 235 12 270 12H440C475 12 485 36 520 36H690C725 36 735 24 770 24H1000"
    : "M0 24H1000";
  const labels = screen === "public-methodology" ? ["PUBLISHED REPORT", "19 QUESTIONS", "ASSESSED RESULT"]
    : screen === "intro" ? ["REPORTING REQUIREMENT", "BETTER EVIDENCE", "BETTER IMPACT"]
    : screen === "quick-generating" ? ["REPORT", "EVIDENCE", "SORP 2026", "19 QUESTIONS", "HISTORICAL SNAPSHOT"]
    : screen === "homework" ? ["DOCUMENT", "EVIDENCE", "SORP", "ASSESSMENT"] : [];

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
      element.style.setProperty("--forward-duration", `${Math.max(8, pixels / SPEED)}s`);
      element.dataset.measured = "true";
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.ownerSVGElement);
    return () => observer.disconnect();
  }, [route, screen]);

  return <div className={`scr-forward-line${benefits ? " scr-forward-line--benefits" : editorial ? " scr-forward-line--editorial" : ""}`}>
    <div className="scr-forward-line-inner">
      <svg viewBox={benefits || editorial ? "0 0 1000 220" : "0 0 1000 48"} preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path key={screen} ref={path} className="scr-forward-trace" d={route} pathLength="100" />
      </svg>
      {labels.length > 0 && <div className="scr-forward-labels">{labels.map((label, index) => <span key={label}>{editorial && <strong aria-hidden="true">0{index + 1}</strong>}{label}</span>)}</div>}
    </div>
  </div>;
}
