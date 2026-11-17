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
type ReportAction = {
  learning?: boolean;
  primaryLabel?: string;
  processingLabel?: string;
  contextTitle?: string;
  contextDetail?: string;
  primaryHref?: string;
  onPrimary?: () => void;
  id: string;
  status: string;
  stage: number;
} | null;
const ReportContext = createContext<Dispatch<SetStateAction<ReportAction>>>(
  () => {},
);
export const useReportAction = () => useContext(ReportContext);
export function ActionShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    [report, setReport] = useState<ReportAction>(null),
    bar = useRef<HTMLElement>(null);
  const review = /^\/reviews\/([a-f0-9-]{36})(\/source)?$/.exec(path);
  const inReview = !!review;
  const learning =
    !!review && report?.id === review[1] && report.learning === true;
  useEffect(() => {
    const el = bar.current;
    if (!el) {
      document.documentElement.style.setProperty("--action-height", "0px");
      return;
    }
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
  }, [inReview, learning]);
  const active =
    (review && report?.id === review[1]) ||
    (path === "/reviews" && report?.id === "workspace")
      ? report
      : null;
  const source = !!review?.[2];
  const support = path === "/your-impact-director";
  const complete = active?.status === "complete";
  const processing = active && !["complete", "failed"].includes(active.status);
  const href =
    active?.primaryHref ||
    (review
      ? source
        ? `/reviews/${review[1]}`
        : active
          ? complete
            ? "#keep-review"
            : "#review-progress"
          : "/reviews"
      : support
        ? "#enquire"
        : "/#upload");
  const label =
    active?.primaryLabel ||
    (review
      ? source
        ? "Back to my review"
        : complete
          ? "Keep your full report"
          : processing
            ? "View review progress"
            : active
              ? "Review needs attention"
              : "Open my saved reports"
      : support
        ? "Talk to us about your Impact Director"
        : "Review your impact report — FREE");
  return (
    <ReportContext.Provider value={setReport}>
      {children}
      {inReview && !learning && (
        <aside
          ref={bar}
          className="permanent-actions"
          aria-label="Review actions"
        >
          <div className="action-context">
            {active?.contextTitle ? (
              <>
                <strong>{active.contextTitle}</strong>
                <span>{active.contextDetail}</span>
              </>
            ) : processing ? (
              <>
                <strong>Reviewing your report</strong>
                <span>
                  {active.processingLabel ||
                    `Stage ${Math.min(active.stage + 1, 15)} of 15 · You can return in this browser`}
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
                <strong>
                  {support
                    ? "Your own Impact Director."
                    : "Your first review. £0."}
                </strong>
                <span>
                  {support
                    ? "Human experience. Support that fits."
                    : "Create your free account to start."}
                </span>
              </>
            )}
          </div>
          <Link
            className="action-primary"
            href={href}
            onClick={(event) => {
              if (active?.onPrimary) {
                event.preventDefault();
                active.onPrimary();
              }
            }}
          >
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
                : "/contact"
            }
          >
            {complete ? "Talk to your Impact Director" : "Contact Us"}
          </Link>
          <Link
            className="action-feedback"
            href={`/feedback?from=${encodeURIComponent(path)}`}
          >
            Help us make this better
          </Link>
        </aside>
      )}
    </ReportContext.Provider>
  );
}
