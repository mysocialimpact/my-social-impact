"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Arrow } from "./icons";
import Image from "next/image";
import { api, useSession } from "./session";
import { useReportAction } from "./action-bar";
import { ScoreCard, ReviewResults } from "./review-results";
import type { ReviewResult } from "@/lib/pipeline";
type Framework = "claims" | "excellence";
const names = {
  claims: "Social Impact Claims Code",
  excellence: "Social Impact Excellence",
};
const lessons = {
  claims: [
    [
      "The introduction",
      "GOOD IMPACT CLAIMS NEED GOOD EVIDENCE.",
      "Five principles from My Social Impact help us ask whether your impact claims stand up to scrutiny.",
    ],
    [
      "01 · Evidence",
      "What’s the proof?",
      "Activities are what you do. Outputs are what you deliver. Outcomes are the changes people experience. Impact is the broader difference you contribute to.",
      "‘2,000 people attended our programme’ is an output. ‘2,000 people moved out of poverty’ needs evidence of a very different kind.",
    ],
    [
      "02 · Proportion",
      "Does the claim match the evidence?",
      "Strong claims need appropriately strong evidence. A small organisation does not need an elaborate evaluation system to report honestly. It needs to say what its evidence can reasonably support.",
      "Ten encouraging interviews can offer useful insight. They cannot establish that everyone benefited.",
    ],
    [
      "03 · Transparency",
      "Show your workings.",
      "Explain where information came from, how it was collected and what its limitations are. Readers can judge evidence more fairly when they understand how it was produced.",
      "Say how many people responded, how they were selected and whose voices might be missing.",
    ],
    [
      "04 · Balance",
      "Tell the whole story.",
      "Challenges, unintended consequences and experiences that differ from the headline belong in an honest account. Acknowledging difficulty strengthens credibility.",
      "If a programme worked for some groups but not others, that difference matters.",
    ],
    [
      "05 · Learning",
      "What will you do differently?",
      "Useful reporting helps people decide what to keep, change or stop. Evidence becomes valuable when it changes the next decision.",
      "Connect what you learned to a named action, a responsible person and a way to check progress.",
    ],
    [
      "The bigger picture",
      "Credibility is a practice.",
      "A report is a starting point for stronger evidence, better decisions and a more useful conversation about impact. Explore your findings or keep learning at your own pace.",
    ],
  ],
  excellence: [
    [
      "The introduction",
      "SOCIAL IMPACT IS A MANAGEMENT DISCIPLINE.",
      "Financial performance is managed. Measured. Discussed. Improved. Social Impact Excellence brings that same seriousness to social impact.",
    ],
    [
      "01 · Purpose",
      "Know why you exist.",
      "Be clear about the difference you intend to make, who it is for and how your work could contribute. Purpose connects daily activity to desired outcomes.",
      "Ask: what should change for the people we exist to serve?",
    ],
    [
      "02 · Leadership",
      "Impact starts at the top.",
      "Impact is a leadership responsibility. Governance, accountability, stakeholder involvement and decisions should reflect the organisation’s social purpose.",
      "A board should discuss what the evidence means, not just sign off a report.",
    ],
    [
      "03 · Data",
      "Measure what matters.",
      "Meaningful information helps distinguish busy activity from useful change. Combine appropriate numbers with people’s experiences and explain the limitations.",
      "Counting appointments tells you about delivery. Understanding what changed afterwards tells you about outcomes.",
    ],
    [
      "04 · Delivery",
      "Turn purpose into action.",
      "Good intentions need to become consistent delivery, meaningful outcomes and continual improvement. Use evidence to adapt how the work happens.",
      "When the evidence challenges your assumptions, change the delivery rather than just the wording.",
    ],
    [
      "05 · Communications",
      "Tell a story worth believing.",
      "Good communication makes evidence understandable, engaging and credible. Attractive design helps when it clarifies the meaning of the evidence.",
      "Let readers see what changed, how you know and what you cannot yet conclude.",
    ],
    [
      "Beyond the report",
      "Impact shouldn’t be an annual reporting exercise.",
      "It should shape how you run your organisation. This document review examines what your report demonstrates. It cannot establish your full organisational maturity. Explore the full Social Impact Excellence Maturity Assessment for that deeper conversation.",
    ],
  ],
};
export type ExperienceReview = {
  id: string;
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
  siblings: { id: string; framework: Framework; status: string }[];
};
function EmailInvitation({
  id,
  full,
  delivery,
  modal = false,
}: {
  id: string;
  full: boolean;
  delivery?: ExperienceReview["delivery"];
  modal?: boolean;
}) {
  const { user } = useSession();
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
    <section className="review-email" id={modal ? undefined : "email-delivery"}>
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
            <p>Your address is verified for this report.</p>
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
              Use another address or resend
            </button>
          </div>
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
                    email: new FormData(e.currentTarget).get("email"),
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
            <button className="button primary" disabled={busy}>
              {busy ? "Sending verification…" : "Email me my full report"}
            </button>
            <p className="fine-print">
              Free. No password or marketing. Confirmed reports: 180 days. Email
              links: 30 minutes.
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
function EmailDialog({
  id,
  full,
  close,
}: {
  id: string;
  full: boolean;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      className="email-dialog"
      ref={dialog}
      aria-label="Email your full report"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <button
        className="dialog-close"
        onClick={close}
        aria-label="Close email options"
      >
        Close ×
      </button>
      <EmailInvitation id={id} full={full} modal />
    </dialog>
  );
}
export function ReviewExperience({ review: r }: { review: ExperienceReview }) {
  const [step, setStep] = useState(0),
    [direction, setDirection] = useState("forward"),
    [emailOpen, setEmailOpen] = useState(false),
    [results, setResults] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lessonHeading = useRef<HTMLHeadingElement>(null);
  const setAction = useReportAction();
  const framework = r.framework === "document" ? null : r.framework,
    complete = r.status === "complete" && !!r.result;
  useEffect(() => {
    setAction({
      id: r.id,
      status: r.status,
      stage: r.stage,
      onPrimary: complete
        ? viewResults
        : framework
          ? () => (r.full ? goStep(0) : setEmailOpen(true))
          : undefined,
      processingLabel: framework
        ? "Processing continues when you leave"
        : undefined,
      primaryLabel:
        r.framework === "document"
          ? "Choose your free review"
          : complete
            ? "View results"
            : r.full
              ? "Email confirmed — you can leave"
              : "Email me my full report",
      primaryHref:
        r.framework === "document"
          ? "#choose-review"
          : complete
            ? "#review-results"
            : r.full
              ? "#learning"
              : "#email-delivery",
    });
  }, [r.id, r.status, r.stage, r.full, r.framework, complete, setAction]);
  function goStep(value: number) {
    setDirection(value < step ? "backward" : "forward");
    setStep(value);
    requestAnimationFrame(() => {
      lessonHeading.current?.focus({ preventScroll: true });
      document.querySelector(".lesson-scroll")?.scrollTo({ top: 0 });
    });
  }
  function viewResults() {
    setResults(true);
    void api("/api/reviews/" + r.id, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "snapshot" }),
    }).catch(() => {});
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
    setBusy(true);
    setError("");
    try {
      const d = await api("/api/reviews/" + r.id, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ framework: f }),
      });
      window.location.assign("/reviews/" + d.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  if (!framework)
    return (
      <div className="review-choice" id="choose-review">
        <p className="eyebrow">One upload. Two methodologies. Your choice.</p>
        <h1>
          One report.
          <br />
          <em>Two ways to look closer.</em>
        </h1>
        <p>
          Choose your first free review. We’ll read and understand your document
          once, then apply the methodology you select.
        </p>
        <p className="review-disclosure">
          <strong>A useful headline snapshot: no email needed.</strong> The full
          detailed report is also free, delivered after email verification.
          {!r.emailEnabled &&
            "Email delivery is currently unavailable; you can still use both headline reviews."}
        </p>
        {r.status === "failed" && (
          <div className="alert error">
            <h2>We’re really sorry — we couldn’t read your report.</h2>
            <p>{r.error_message}</p>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => retrySaved(r.id)}
            >
              Retry reading the saved report
            </button>
            <Link href="/feedback?issue=upload">Help us make this better</Link>
          </div>
        )}
        <div className="review-choices">
          {(["claims", "excellence"] as Framework[]).map((f) => (
            <section key={f}>
              <Image
                src={
                  f === "claims"
                    ? "/brand/claims-code.png"
                    : "/brand/excellence.png"
                }
                alt={names[f]}
                width={140}
                height={140}
              />
              <h2>
                {f === "claims"
                  ? "Can your impact claims stand up to scrutiny?"
                  : "What does your report reveal about how you manage impact?"}
              </h2>
              <p>
                {f === "claims"
                  ? "Evidence. Proportion. Transparency. Balance. Learning."
                  : "Purpose. Leadership. Data. Delivery. Communications."}
              </p>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => choose(f)}
              >
                {r.siblings?.find((s) => s.framework === f)
                  ? "Return to "
                  : "Start "}
                {names[f]} — free
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
  const lesson = lessons[framework][step],
    other = framework === "claims" ? "excellence" : "claims";
  return (
    <div
      className={
        "two-review two-review-" +
        framework +
        (results ? " review-result-page" : " immersive-review")
      }
    >
      <div className="immersive-meta">
        <Link className="review-back" href="/">
          ← Back to My Impact Director
        </Link>
        <div className="review-product-heading">
          <Image
            src={
              framework === "claims"
                ? "/brand/claims-code.png"
                : "/brand/excellence.png"
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
                disabled={busy}
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
                  ? "Your Impact Director is preparing your report."
                  : "Your Impact Director is reading your report."}
              </strong>{" "}
              {r.error_message ||
                "You can leave this page; processing continues in the background."}
            </>
          )}
        </div>
      </div>
      <div id="review-results" className="review-stage">
        {complete && results && r.result ? (
          <>
            <h2 className="snapshot-heading">
              {framework === "claims"
                ? "Your claims. Under the microscope."
                : "Beyond reporting. Towards better impact management."}
            </h2>
            <ScoreCard
              framework={framework}
              score={r.result.scores[framework]!}
            />
            <section className="snapshot-copy">
              <h2>The headline snapshot</h2>
              <p>{r.result.actions.summary}</p>
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
              <h3>Three priorities</h3>
              {r.result.actions.actions.slice(0, 3).map((a) => (
                <article key={a.title}>
                  <h4>{a.title}</h4>
                  <p>{a.detail}</p>
                </article>
              ))}
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
          <section
            className={
              "methodology-lesson lesson-" + step + " slide-" + direction
            }
            id="learning"
          >
            <div className="lesson-scroll" key={step}>
              <div
                className={
                  step === 0
                    ? "lesson-composition opening-slide"
                    : "lesson-composition"
                }
              >
                <div className="lesson-copy">
                  <p className="lesson-position">
                    {lesson[0]}{" "}
                    <span>
                      {step + 1} / {lessons[framework].length} · Learning
                    </span>
                  </p>
                  <h2 ref={lessonHeading} tabIndex={-1}>
                    {lesson[1]}
                  </h2>
                  <p className="lesson-explanation">{lesson[2]}</p>
                  {lesson[3] && <blockquote>{lesson[3]}</blockquote>}
                  {step === 0 && (
                    <p className="stay-invitation">
                      Confirm your email, then you can close this page. Or stay
                      and explore.
                    </p>
                  )}
                  {step === 6 && framework === "excellence" && (
                    <a href="https://socialimpactexcellence.org">
                      Explore the full framework & maturity assessment{" "}
                      <Arrow diagonal />
                    </a>
                  )}
                </div>
                {step === 0 && (
                  <EmailInvitation
                    id={r.id}
                    full={r.full}
                    delivery={r.delivery}
                  />
                )}
              </div>
            </div>
            <div className="lesson-controls">
              <nav aria-label="Learning sequence">
                <button disabled={step === 0} onClick={() => goStep(step - 1)}>
                  ← Previous
                </button>
                <span>
                  Explore at your own pace. This is learning, not processing
                  progress.
                </span>
                <button
                  disabled={step === lessons[framework].length - 1}
                  onClick={() => goStep(step + 1)}
                >
                  Next →
                </button>
              </nav>
              <div className="lesson-jump">
                {lessons[framework].map((l, i) => (
                  <button
                    key={l[0]}
                    aria-current={step === i ? "step" : undefined}
                    onClick={() => goStep(i)}
                    aria-label={l[0]}
                  >
                    {i === 0
                      ? "Introduction"
                      : i === 6
                        ? "The bigger picture"
                        : l[0]}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
      {results && (
        <EmailInvitation id={r.id} full={r.full} delivery={r.delivery} />
      )}
      {emailOpen && (
        <EmailDialog
          id={r.id}
          full={r.full}
          close={() => setEmailOpen(false)}
        />
      )}
      {complete && results && (
        <section className="next-methodology">
          <h2>Your Impact Director has another way to look at this report.</h2>
          <h3>
            {other === "excellence"
              ? "Are you managing impact as seriously as your finances?"
              : "Can your impact claims stand up to scrutiny?"}
          </h3>
          <p>
            Same document. A different set of questions. No new upload or
            repeated extraction.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => choose(other)}
          >
            Review against {names[other]} — free
          </button>
          {error && <p role="alert">{error}</p>}
        </section>
      )}
      {complete && results && (
        <section className="bigger-conversation">
          <h2>
            {framework === "claims"
              ? "Want to discuss your findings?"
              : "Want to take your impact management further?"}
          </h2>
          <p>
            Use what you learn to make better decisions throughout the year. My
            Social Impact helps embed impact in strategy, leadership, data,
            delivery and communications.
          </p>
          <Link href={`/services/expert-review?review=${r.id}`}>
            Discuss your impact report <Arrow diagonal />
          </Link>
          <p>
            <Link href="/services/preparation">Create your next report</Link> ·{" "}
            <Link href="/services/digitisation">Digitise your report</Link>
          </p>
          <p>
            What if you had your own Impact Director? Our future intelligent
            partner is an emerging ambition. Professional support is available
            by enquiry.
          </p>
          <Link href="/#contact">
            Meet Marcus & contact us <Arrow diagonal />
          </Link>
        </section>
      )}
    </div>
  );
}
