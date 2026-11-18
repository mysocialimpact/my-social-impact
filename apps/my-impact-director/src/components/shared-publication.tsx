"use client";
import { useEffect, useState } from "react";
import type { ReviewResult } from "@/lib/pipeline";
import { ReportPublication } from "./report-publication";
import { ReviewResults } from "./review-results";
import { ContextualOffers } from "./contextual-offers";
export function SharedPublication() {
  const [report, setReport] = useState<ReviewResult | null>(null),
    [message, setMessage] = useState("Opening the shared report…");
  useEffect(() => {
    let active = true,
      sequence = 0,
      loaded = false;
    async function check() {
      const seq = ++sequence;
      const token = window.location.hash.slice(1);
      try {
        if (!token) throw Error();
        const response = await fetch("/api/shared-review", {
          method: "POST",
          cache: "no-store",
          credentials: "omit",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, statusOnly: loaded }),
        });
        if (!response.ok) throw Error();
        const data = await response.json();
        if (active && seq === sequence && data.report) {
          loaded = true;
          setReport(data.report);
        }
      } catch {
        if (active && seq === sequence) {
          loaded = false;
          setReport(null);
          setMessage(
            "This report could not be opened. Check the link with its owner and try again.",
          );
        }
      }
    }
    function changed() {
      loaded = false;
      setReport(null);
      void check();
    }
    function visible() {
      if (!document.hidden) void check();
    }
    void check();
    const timer = setInterval(visible, 30000);
    window.addEventListener("hashchange", changed);
    window.addEventListener("pageshow", visible);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("pageshow", visible);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  if (!report?.framework)
    return (
      <section className="section narrow">
        <h1>Shared report</h1>
        <p role="status">{message}</p>
      </section>
    );
  return (
    <div
      className="shared-publication"
      onClick={(e) => {
        const link = (e.target as Element).closest("a[href^='#']");
        const target =
          link && document.getElementById(link.getAttribute("href")!.slice(1));
        if (!target) return;
        e.preventDefault();
        let ancestor: Element | null = target;
        while (ancestor) {
          if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
          ancestor = ancestor.parentElement;
        }
        target.scrollIntoView();
      }}
    >
      <ReportPublication
        result={report}
        framework={report.framework}
        id=""
        hasDetails
      />
      <ContextualOffers framework={report.framework} />
      <details className="full-review-details" id="supporting-evidence">
        <summary>Explore the complete criterion-level assessment</summary>
        <ReviewResults id="" result={report} appendix />
      </details>
    </div>
  );
}
