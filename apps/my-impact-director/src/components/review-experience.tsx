"use client";
import { ImpactVerdict } from "./impact-verdict";
import { ReviewLearning } from "./review-learning";
import { ContextualOffers } from "./contextual-offers";
import {
  isReportV2,
  isRevisedReport,
  reportRubricFor,
  reportPillars,
  REPORT_VERSION,
} from "@/lib/report-methodology";
import { CreativeCaveat } from "./creative-caveat";
import { SaveReview } from "./save-review";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Arrow } from "./icons";
import Image from "next/image";
import { api, useSession } from "./session";
import { useReportAction } from "./action-bar";
import { ScoreCard, ReviewResults } from "./review-results";
import type { ReviewResult } from "@/lib/pipeline";
import {
  type Framework,
  FRAMEWORKS,
  frameworkNames as names,
  frameworkLogos,
} from "@/lib/rubric";
export type ExperienceReview = {
  id: string;
  version?: string;
  framework: "document" | Framework;
  status: string;
  stage: number;
  understanding_ready: boolean;
  full: boolean;
  emailEnabled: boolean;
  delivery?: { state: "accepted" | "pending" | "failed"; attempts: number };
  ingestion?: { id: string; status: string; error_message: string | null };
  organisation: string;
  title: string;
  error_message: string | null;
  result: ReviewResult | null;
  siblings: {
    id: string;
    framework: Framework;
    status: string;
    has_result?: boolean;
    version?: string;
  }[];
};
function EmailInvitation({
  id,
  full,
  delivery,
}: {
  id: string;
  full: boolean;
  delivery?: ExperienceReview["delivery"];
}) {
  const { user, loading: sessionLoading } = useSession();
  const [enabled, setEnabled] = useState<boolean | null>(null),
    [sent, setSent] = useState(false),
    [reusedVerification, setReusedVerification] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    api("/api/save")
      .then((d) => {
        if (live) setEnabled(d.emailEnabled);
      })
      .catch(() => {
        if (live) setEnabled(false);
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <section className="review-email" id="email-delivery">
      <div>
        <h2>
          {full || reusedVerification
            ? "Email confirmed."
            : "Your full report, emailed."}
        </h2>
        <p>
          {full || reusedVerification
            ? "We’ll send your complete report as soon as it’s ready. You can continue exploring or leave this page."
            : "Confirm your email. We’ll send your full report when it’s ready. You can close this page and get on with your day."}
        </p>
      </div>
      <div>
        {full || reusedVerification ? (
          <div role="status">
            <p>
              {user?.email
                ? `Delivery address: ${user.email}`
                : "Your address is verified for this report."}
            </p>
            {delivery?.state === "accepted" ? (
              <p>
                The email service has accepted your full report for delivery.
                Check your inbox or spam folder.
              </p>
            ) : delivery?.state === "failed" ? (
              <>
                <p>
                  We’re sorry — your report is ready, but email delivery could
                  not be completed. You can download it from your results or
                  retry delivery.
                </p>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await api("/api/reviews/" + id, {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ action: "retry-delivery" }),
                      });
                      setSent(true);
                      window.dispatchEvent(new Event("mid-review-refresh"));
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Please try again.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {sent ? "Delivery retry requested" : "Retry email delivery"}
                </button>
              </>
            ) : (
              <p>
                We’ll email your complete report as soon as it’s ready. You can
                leave this page.
              </p>
            )}
          </div>
        ) : sent ? (
          <div role="status">
            <p>
              Check your inbox and confirm your address. Once confirmed, you can
              leave — we’ll send your report when it’s ready.
            </p>
            <button className="subtle-button" onClick={() => setSent(false)}>
              Resend verification email
            </button>
          </div>
        ) : sessionLoading ? (
          <p role="status">Checking your account…</p>
        ) : enabled ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const saved = await api("/api/save", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    reviewId: id,
                    email:
                      user && !user.anonymous
                        ? user.email
                        : new FormData(e.currentTarget).get("email"),
                  }),
                });
                setReusedVerification(saved.verified === true);
                setSent(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {user && !user.anonymous ? (
              <p className="remembered-email">
                Your account email: <strong>{user.email}</strong>. Confirm it
                once for detailed report delivery.
              </p>
            ) : (
              <label>
                Email address
                <input
                  name="email"
                  defaultValue={user?.anonymous ? "" : user?.email || ""}
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Sending verification…" : "Confirm my email for delivery"}
            </button>
            <p className="fine-print">
              No marketing. Confirmed reports: 180 days. Verification links: 30
              minutes.
            </p>
          </form>
        ) : (
          <p className="email-unavailable">
            {enabled === null
              ? "Checking email delivery…"
              : "Email delivery is temporarily unavailable. Your free headline snapshot will remain available in this browser. We can’t send or unlock a detailed report by email until delivery is restored."}
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
  );
}
export function ReviewExperience({ review: r }: { review: ExperienceReview }) {
  const { user: accountUser, loading: accountLoading } = useSession();
  const searchParams = useSearchParams();
  const [results, setResults] = useState(searchParams.get("results") === "1"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (searchParams.get("results") === "1") setResults(true);
  }, [searchParams]);
  const setAction = useReportAction();
  const framework = r.framework === "document" ? null : r.framework,
    complete = r.status === "complete" && !!r.result;
  const siblings = (r.siblings || [])
    .filter((s, i, a) => a.findIndex((x) => x.framework === s.framework) === i)
    .map((s) =>
      s.id === r.id ? { ...s, has_result: !!r.result, status: r.status } : s,
    );
  const completedCount = siblings.filter(
    (s) => s.status === "complete" && s.has_result,
  ).length;
  const nextFramework = FRAMEWORKS.find(
    (f) =>
      !siblings.some(
        (s) => s.framework === f && s.status === "complete" && s.has_result,
      ),
  );
  useEffect(() => {
    const allDone = completedCount === 3;
    const nextAfterResults = complete && results;
    setAction({
      id: r.id,
      learning: !!framework && !results,
      status: r.status,
      stage: r.stage,
      contextTitle:
        r.status === "failed"
          ? "Your review needs attention."
          : framework
            ? complete
              ? allDone
                ? "All three reviews complete."
                : `You’ve completed ${completedCount || 1} of 3 reviews.`
              : r.full
                ? "Your report is being prepared."
                : "Your report is being prepared."
            : allDone
              ? "All three reviews complete."
              : completedCount
                ? `You’ve completed ${completedCount} of 3 reviews.`
                : "One report. Three reviews. Your progress.",
      contextDetail:
        r.status === "failed"
          ? "Retry your saved review or contact us for help."
          : framework
            ? complete
              ? r.full
                ? "Your results are ready to explore."
                : "Headline results now. Full report after email verification."
              : r.full
                ? "We’ll email you when it’s ready."
                : "Explore how we arrive at your score."
            : "Choose any review. We reuse this document.",
      primaryLabel: !framework
        ? allDone
          ? "Explore your reports"
          : completedCount
            ? "Explore your next review"
            : "Start your first free review"
        : complete
          ? nextAfterResults
            ? allDone
              ? "Explore your reports"
              : "Explore your next review"
            : "View your results"
          : r.status === "failed"
            ? "Resolve review issue"
            : "Explore the methodology",
      primaryHref: !framework
        ? allDone
          ? "/reviews"
          : "#choose-review"
        : nextAfterResults && allDone
          ? "/reviews"
          : complete
            ? "#review-results"
            : "#learning",
      onPrimary: !framework
        ? undefined
        : complete
          ? nextAfterResults
            ? allDone
              ? () => window.location.assign("/reviews")
              : () => {
                  document
                    .querySelector(".next-review")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            : viewResults
          : r.status === "failed"
            ? () => document.querySelector(".honest-status")?.scrollIntoView()
            : undefined,
      processingLabel: "Processing continues when you leave",
    });
  }, [
    r.id,
    r.status,
    r.stage,
    r.full,
    r.framework,
    r.result,
    complete,
    results,
    completedCount,
    nextFramework,
    setAction,
  ]);
  const recordedView = useRef("");
  useEffect(() => {
    if (!complete || !results || recordedView.current === r.id) return;
    recordedView.current = r.id;
    void api("/api/reviews/" + r.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "snapshot" }),
    })
      .then(() => window.dispatchEvent(new Event("mid-workspace-refresh")))
      .catch(() => {});
  }, [complete, results, r.id]);
  function viewResults() {
    setResults(true);
  }
  async function retrySaved(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("/api/reviews/" + id, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  async function choose(f: Framework) {
    if (accountLoading) return;
    if (!accountUser || accountUser.anonymous) {
      window.location.assign(
        `/login?mode=signup&next=${encodeURIComponent("/reviews/" + r.id)}`,
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const d = await api("/api/reviews/" + r.id, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ framework: f }),
      });
      const existing = r.siblings?.find((s) => s.id === d.id);
      window.location.assign(
        "/reviews/" +
          d.id +
          (existing?.status === "complete" && existing.has_result
            ? "?results=1"
            : ""),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  function choiceLabel(f: Framework) {
    if (accountLoading) return "Checking your account…";
    const sibling = r.siblings?.find((s) => s.framework === f);
    return !sibling
      ? `Start ${names[f]} — free`
      : sibling.status === "complete" && sibling.has_result
        ? `View ${names[f]} results`
        : sibling.status === "failed" || sibling.status === "complete"
          ? `Resolve ${names[f]} review`
          : `View ${names[f]} progress`;
  }
  if (!framework)
    return (
      <div className="review-choice" id="choose-review">
        <p className="eyebrow">One upload. Three methodologies. Your choice.</p>
        <h1>
          One report.
          <br />
          <em>Three ways to look closer.</em>
        </h1>
        <p>
          {completedCount
            ? "Your workspace is ready. Open your results or explore another perspective. We reuse this document for each review."
            : "Choose your first free review. We’ll read and understand your document once, then apply the methodology you select."}
        </p>
        <p className="review-disclosure">
          <strong>Your reports stay in your account.</strong> Confirm your
          account email once for detailed results and report delivery.
          {!r.emailEnabled &&
            "Email delivery is currently unavailable; you can still use all three headline reviews."}
        </p>
        {r.status === "failed" && (
          <div className="alert error">
            <h2>We’re really sorry — we couldn’t read your report.</h2>
            <p>{r.error_message}</p>
            <button
              className="button primary"
              disabled={busy || accountLoading}
              onClick={() => retrySaved(r.id)}
            >
              Retry reading the saved report
            </button>
            <Link href="/feedback?issue=upload">Help us make this better</Link>
          </div>
        )}
        <SaveReview id={r.id} />
        <div className="review-choices">
          {FRAMEWORKS.map((f) => (
            <section key={f}>
              <Image
                src={frameworkLogos[f]}
                alt={names[f]}
                width={140}
                height={140}
              />
              <h2>
                {f === "claims"
                  ? "Can your impact claims stand up to scrutiny?"
                  : f === "report"
                    ? "Does your impact report make an impact?"
                    : "What does your report reveal about how you manage impact?"}
              </h2>
              {f === "report" && (
                <p className="edit-attribution">
                  An Impact Report Excellence assessment developed by My Social
                  Impact.
                </p>
              )}
              <p>
                {f === "claims"
                  ? "Evidence. Proportion. Transparency. Balance. Learning."
                  : f === "report"
                    ? "Readability & Copy. Information Hierarchy. Visual Design. Storytelling. Data Presentation."
                    : "Purpose. Leadership. Data. Delivery. Communications."}
              </p>
              <button
                className="button primary"
                disabled={busy || accountLoading}
                onClick={() => choose(f)}
              >
                {choiceLabel(f)}
              </button>
            </section>
          ))}
        </div>
        <p role="status">
          {r.understanding_ready
            ? "Your document understanding is ready to reuse."
            : "We’re reading and indexing your document in the background."}
        </p>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  return (
    <div
      className={
        "two-review two-review-" +
        framework +
        (results ? " review-result-page" : " immersive-review")
      }
    >
      {results && (
        <div className="immersive-meta">
          <Link className="review-back" href="/">
            ← Back to My Impact Director
          </Link>
          <div className="review-product-heading">
            <Image
              src={
                framework === "report"
                  ? "/brand/the-impact-edit-symbol.svg"
                  : frameworkLogos[framework]
              }
              alt={names[framework]}
              width={110}
              height={110}
            />
            <div>
              <p>
                Developed by{" "}
                <a href="https://mysocialimpact.org">My Social Impact</a>
              </p>
              <h1>{names[framework]}</h1>
              <p className="report-name" title={r.organisation || r.title}>
                {r.organisation || r.title}
              </p>
            </div>
          </div>
          <div className="honest-status" role="status">
            {complete ? (
              <>
                <strong>Your results are ready.</strong>{" "}
                <button onClick={viewResults}>
                  See my results <Arrow diagonal />
                </button>
              </>
            ) : r.status === "failed" || r.ingestion?.status === "failed" ? (
              <>
                <strong>
                  We’re really sorry — we couldn’t complete this review.
                </strong>{" "}
                {r.error_message || r.ingestion?.error_message}{" "}
                <button
                  disabled={busy || accountLoading}
                  onClick={() =>
                    retrySaved(
                      r.ingestion?.status === "failed" ? r.ingestion.id : r.id,
                    )
                  }
                >
                  Retry the saved review
                </button>
                <Link href={"/feedback?from=/reviews/" + r.id}>
                  Help us make this better
                </Link>
              </>
            ) : (
              <>
                <strong>
                  {r.understanding_ready
                    ? r.framework === "report"
                      ? r.stage === 16
                        ? "Inspecting rendered pages."
                        : r.stage >= 17
                          ? `Reviewing ${(isReportV2(r.version) ? reportRubricFor(r.version).map((p) => p[0]) : ["Clarity", "Storytelling", "Design", "Engagement", "Communication"])[r.stage - 17] || "your findings"}.`
                          : "Preparing your creative recommendations."
                      : "Your Impact Director is preparing your report."
                    : "Your Impact Director is reading your report."}
                </strong>{" "}
                {r.error_message ||
                  "You can leave this page; processing continues in the background."}
              </>
            )}
          </div>
        </div>
      )}
      <div id="review-results" className="review-stage">
        {complete && results && r.result ? (
          <>
            <h2 className="snapshot-heading">
              {framework === "claims"
                ? "Your claims. Under the microscope."
                : framework === "report"
                  ? "Does your impact report make an impact?"
                  : "Beyond reporting. Towards better impact management."}
            </h2>
            {framework === "report" && !isRevisedReport(r.result.version) && (
              <CreativeCaveat version={r.result.version} />
            )}
            {framework === "report" && isRevisedReport(r.result.version) ? (
              <ImpactVerdict result={r.result} />
            ) : (
              <ScoreCard
                framework={framework}
                score={r.result.scores[framework]!}
                version={r.result.version}
                rating={framework === "report" ? r.result.rating : undefined}
              />
            )}
            <section className="snapshot-copy">
              <h2>
                {framework === "report"
                  ? "What works. What needs attention."
                  : "The headline snapshot"}
              </h2>
              {framework !== "report" && <p>{r.result.actions.summary}</p>}
              <div className="strength-grid">
                <div>
                  <h3>Main strengths</h3>
                  <ul>
                    {r.result.actions.strengths.slice(0, 3).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Important gaps & concerns</h3>
                  <ul>
                    {r.result.actions.opportunities.slice(0, 3).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {!(
                framework === "report" && isRevisedReport(r.result.version)
              ) && (
                <>
                  <h3>Three priorities</h3>
                  {r.result.actions.actions.slice(0, 3).map((a) => (
                    <article key={a.title}>
                      <h4>{a.title}</h4>
                      <p>{a.detail}</p>
                    </article>
                  ))}
                </>
              )}
              <p>
                Indicative automated document review, not independent assurance.
                {framework === "excellence" && (
                  <>
                    {" "}
                    This is not a full organisational maturity assessment.{" "}
                    <a href="https://socialimpactexcellence.org">
                      Explore the full assessment <Arrow diagonal />
                    </a>
                  </>
                )}
              </p>
            </section>
            {framework === "report" && !isRevisedReport(r.result.version) && (
              <div className="notice">
                <p>
                  This is your preserved v{r.result.version} assessment. The new
                  methodology uses revised pillars, weights and direct visual
                  inspection. Overall numeric publication is paused during beta
                  calibration.
                </p>
                <button
                  className="button secondary"
                  disabled={busy || accountLoading}
                  onClick={() => choose("report")}
                >
                  Run the revised Impact Edit beta
                </button>
              </div>
            )}
            {(r.siblings || []).some(
              (s) => s.framework === "report" && s.id !== r.id,
            ) &&
              framework === "report" && (
                <details>
                  <summary>
                    Other methodology versions for this document
                  </summary>
                  {r.siblings
                    .filter((s) => s.framework === "report" && s.id !== r.id)
                    .map((s) => (
                      <p key={s.id}>
                        <Link
                          href={`/reviews/${s.id}${s.status === "complete" ? "?results=1" : ""}`}
                        >
                          The Impact Edit · {s.version || "original version"} ·{" "}
                          {s.status}
                        </Link>
                      </p>
                    ))}
                </details>
              )}
            {r.full && (
              <>
                <a
                  className="button primary"
                  href={`/api/reviews/${r.id}/export`}
                >
                  Download my full {names[framework]} report
                </a>
                <details className="full-review-details">
                  <summary>
                    Explore the complete criterion-level assessment
                  </summary>
                  <ReviewResults id={r.id} result={r.result} />
                </details>
              </>
            )}
            <button className="subtle-button" onClick={() => setResults(false)}>
              Return to the learning experience
            </button>
          </>
        ) : (
          <ReviewLearning
            key={r.id}
            framework={framework}
            version={r.version || r.result?.version || REPORT_VERSION}
            state={
              complete
                ? "ready"
                : r.status === "failed" || r.ingestion?.status === "failed"
                  ? "failed"
                  : "preparing"
            }
            onViewResults={viewResults}
            onRetry={() =>
              retrySaved(
                r.ingestion?.status === "failed" ? r.ingestion.id : r.id,
              )
            }
            busy={busy}
            failure={r.error_message || r.ingestion?.error_message || error}
          />
        )}
      </div>
      {results && (
        <EmailInvitation id={r.id} full={r.full} delivery={r.delivery} />
      )}
      {complete &&
        results &&
        FRAMEWORKS.filter((f) => f !== framework).map((other) => (
          <section className="next-review" key={other}>
            <p className="eyebrow">SAME DOCUMENT. ANOTHER PERSPECTIVE.</p>
            <h3>{names[other]}</h3>
            <p>
              {other === "report"
                ? "How effectively does your report communicate its impact?"
                : other === "claims"
                  ? "Can we trust what the report claims?"
                  : "What does the report demonstrate about managing impact?"}
            </p>
            <button
              className="button primary"
              disabled={busy || accountLoading}
              onClick={() => choose(other)}
            >
              {choiceLabel(other)}
            </button>
            {error && <p role="alert">{error}</p>}
          </section>
        ))}
      {complete && results && (
        <ContextualOffers framework={framework} reviewId={r.id} />
      )}
    </div>
  );
}
