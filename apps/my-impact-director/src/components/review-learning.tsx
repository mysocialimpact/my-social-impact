"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { learningSlides } from "@/lib/review-learning";
import { frameworkNames, frameworkLogos, type Framework } from "@/lib/rubric";

export function ReviewLearning({
  framework,
  version,
  state,
  onViewResults,
  onRetry,
  busy,
  failure,
}: {
  framework: Framework;
  version: string;
  state: "preparing" | "ready" | "failed";
  onViewResults: () => void;
  onRetry: () => void;
  busy: boolean;
  failure?: string | null;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const heading = useRef<HTMLHeadingElement>(null);
  const deck = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const visited = useRef(false);
  const slides = learningSlides(framework, version);
  useLayoutEffect(() => {
    const element = deck.current;
    const frame = element?.closest<HTMLElement>(".immersive-review");
    if (!element || !frame) return;
    const measure = () => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      const height = window.visualViewport?.height || window.innerHeight;
      frame.style.setProperty(
        "--learning-available-height",
        `${Math.max(0, Math.floor(height - top))}px`,
      );
    };
    let pendingFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(pendingFrame);
      pendingFrame = requestAnimationFrame(measure);
    });
    // The workspace may finish loading after the review. Observing its parent
    // also covers that replacement and changes in the tracker’s height.
    for (const selector of [".campaign-header", ".report-workspace"]) {
      const target = document.querySelector(selector);
      if (target) observer.observe(target);
    }
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(pendingFrame);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      frame.style.removeProperty("--learning-available-height");
    };
  }, []);
  const go = useCallback(
    (value: number) => {
      const next = Math.max(0, Math.min(slides.length - 1, value));
      if (next === step) return;
      setDirection(next < step ? "backward" : "forward");
      setStep(next);
    },
    [step, slides.length],
  );
  useEffect(() => {
    if (visited.current) heading.current?.focus({ preventScroll: true });
    visited.current = true;
    scroll.current?.scrollTo({ top: 0 });
  }, [step]);
  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        target.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
      )
        return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        go(step + (event.key === "ArrowRight" ? 1 : -1));
      }
    };
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [go, step]);
  const slide = slides[step];
  const intro = step === 0;
  const headline =
    intro &&
    state !== "preparing" &&
    slide.headline === "WE’RE PREPARING YOUR REVIEW."
      ? "DISCOVER HOW WE ASSESS IT."
      : slide.headline;
  const explanation =
    intro && state !== "preparing"
      ? slide.explanation.replace(
          "While we review your report, discover",
          "Discover",
        )
      : slide.explanation;
  return (
    <section
      ref={deck}
      className="learning-deck"
      aria-label={`${frameworkNames[framework]} methodology`}
      data-step={step}
      data-tone={step % 2 === 0 ? "navy" : "orange"}
    >
      <header className="learning-toolbar">
        <div className="learning-identity">
          <Link href="/reviews" className="learning-back">
            ← My Reports
          </Link>
          <div className="learning-product">
            <Image
              src={
                framework === "report"
                  ? "/brand/the-impact-edit-symbol.svg"
                  : frameworkLogos[framework]
              }
              alt=""
              width={40}
              height={40}
            />
            <h1>{frameworkNames[framework]}</h1>
          </div>
        </div>
        <div className={`learning-status is-${state}`} role="status">
          <strong>
            <span className="learning-status-dot" aria-hidden="true" />
            {state === "ready"
              ? "Your results are ready."
              : state === "failed"
                ? "Your review needs attention."
                : "Preparing your report."}
          </strong>
          {state === "ready" ? (
            <button onClick={onViewResults} className="learning-results">
              View results ↗
            </button>
          ) : state === "failed" ? (
            <>
              <button onClick={onRetry} disabled={busy}>
                {busy ? "Retrying…" : "Retry saved review"}
              </button>
              {failure && (
                <details>
                  <summary>What happened?</summary>
                  <p>{failure}</p>
                  <Link href="/contact">Contact us</Link>
                </details>
              )}
            </>
          ) : (
            <span>Processing continues if you leave.</span>
          )}
        </div>
        <div className="learning-navigation">
          <p className="learning-position" aria-live="polite">
            <span>{String(step + 1).padStart(2, "0")} / 07</span> —{" "}
            {slide.label}
          </p>
          <nav aria-label="Educational slides">
            <button disabled={step === 0} onClick={() => go(step - 1)}>
              ← Previous
            </button>
            <button
              disabled={step === slides.length - 1}
              onClick={() => go(step + 1)}
            >
              Next →
            </button>
          </nav>
        </div>
      </header>
      <div
        ref={scroll}
        className="learning-canvas"
        tabIndex={0}
        aria-label="Methodology slide"
      >
        <div className={`learning-slide enter-${direction}`} key={step}>
          <div className="learning-statement">
            <h2 ref={heading} tabIndex={-1}>
              {headline}
            </h2>
            <p className="learning-explanation">
              {slide.why && (
                <span className="learning-copy-label">
                  What we’re looking for
                </span>
              )}
              {explanation}
            </p>
            {slide.why && (
              <p className="learning-why">
                <span className="learning-copy-label">Why it matters</span>
                {slide.why}
              </p>
            )}
            {slide.example && (
              <blockquote>
                <span>For example</span>
                {slide.example}
              </blockquote>
            )}
            {intro && (
              <p className="learning-next">
                Next:{" "}
                {slides[1].label === "Readability and hierarchy"
                  ? "Readability"
                  : slides[1].label}
                .
              </p>
            )}
            {step === slides.length - 1 && (
              <a
                className="learning-more"
                href={
                  slide.href ||
                  (framework === "excellence"
                    ? "https://socialimpactexcellence.org"
                    : "https://www.mysocialimpact.org")
                }
              >
                {slide.linkLabel || "Explore My Social Impact ↗"}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
