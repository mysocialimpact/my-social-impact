"use client";
import { Arrow } from "./icons";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { usePathname } from "next/navigation";
type ReportAction = { id: string; status: string; stage: number } | null;
const ReportContext = createContext<Dispatch<SetStateAction<ReportAction>>>(
  () => {},
);
export const useReportAction = () => useContext(ReportContext);
export function ActionShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    [report, setReport] = useState<ReportAction>(null),
    bar = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        "--action-height",
        `${el.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--action-height");
    };
  }, []);
  const review = /^\/reviews\/([a-f0-9-]{36})(\/source)?$/.exec(path);
  const active = review && report?.id === review[1] ? report : null;
  const source = !!review?.[2];
  const complete = active?.status === "complete";
  const processing = active && !["complete", "failed"].includes(active.status);
  const href = review
    ? source
      ? `/reviews/${review[1]}`
      : active
        ? complete
          ? "#keep-review"
          : "#review-progress"
        : "/reviews"
    : "/#upload";
  const label = review
    ? source
      ? "Back to my review"
      : complete
        ? "Keep your full report"
        : processing
          ? "View review progress"
          : active
            ? "Review needs attention"
            : "Open my saved reports"
    : "Review your impact report — FREE";
  return (
    <ReportContext.Provider value={setReport}>
      {children}
      <aside ref={bar} className="permanent-actions" aria-label="Page actions">
        <div className="action-context">
          {processing ? (
            <>
              <strong>Reviewing your report</strong>
              <span>
                Stage {Math.min(active.stage + 1, 15)} of 15 · You can return in
                this browser
              </span>
            </>
          ) : complete ? (
            <>
              <strong>Your review. Your next step.</strong>
              <span>Download it. Keep it. Put it to work.</span>
            </>
          ) : active ? (
            <>
              <strong>Your report is saved.</strong>
              <span>Open your review for recovery options.</span>
            </>
          ) : (
            <>
              <strong>Your first review. £0.</strong>
              <span>No registration required.</span>
            </>
          )}
        </div>
        <Link className="action-primary" href={href}>
          {label}
          <span aria-hidden="true">
            <Arrow diagonal />
          </span>
        </Link>
        <Link
          className="action-talk"
          href={
            review
              ? `/services/expert-review?review=${review[1]}`
              : "/services/expert-review#enquire"
          }
        >
          {complete ? "Get expert help" : "Talk to us"}
        </Link>
        <Link
          className="action-feedback"
          href={`/feedback?from=${encodeURIComponent(path)}`}
        >
          Help us make this better
        </Link>
      </aside>
    </ReportContext.Provider>
  );
}
