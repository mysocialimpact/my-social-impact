"use client";
import { ContextualOffers } from "./contextual-offers";
import {
  isReportV2,
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
const lessons = {
  report: [
    [
      "The introduction",
      "A GREAT IMPACT REPORT SHOULD MAKE AN IMPACT.",
      "Having a powerful story isn’t enough. You have to communicate it well. We inspect the writing and actual page design across five pillars. This is an indicative creative review by My Social Impact, not accreditation. Creative judgements are partly subjective; different readers may respond differently.",
    ],
    [
      "01 · Clarity",
      "MAKE IT EASY TO UNDERSTAND.",
      "The best reports make complicated information accessible. Plain English, useful navigation and a clear hierarchy help readers find what matters.",
      "Try a takeaway above a detailed table: what should your reader understand before exploring the numbers?",
    ],
    [
      "02 · Storytelling",
      "EVERY NUMBER HAS A STORY.",
      "Connect evidence to real people and meaningful change. A coherent story explains purpose, action, change and what happens next.",
      "An example should illuminate a wider finding. Protect dignity; a moving story is not a substitute for evidence.",
    ],
    [
      "03 · Design",
      "MAKE EVERY PAGE COUNT.",
      "Typography, composition and art direction help the message land. We inspect rendered pages, not just extracted words.",
      "A simple black-and-white publication can excel. Use size, spacing and alignment to make important information stand out.",
    ],
    [
      "04 · Engagement",
      "GIVE PEOPLE A REASON TO KEEP READING.",
      "Capture attention and reward curiosity. A purposeful opening, varied pacing and relevant visuals help readers explore.",
      "Judge the medium fairly: a useful static PDF does not need animations or interactive features.",
    ],
    [
      "05 · Communication",
      "MAKE THE MESSAGE MATTER.",
      "Help people understand, remember and act. Make the main message, data explanations and next steps clear.",
      "Give a chart an informative title, legible labels and a short explanation of the conclusion readers can draw.",
    ],
    [
      "The bigger picture",
      "YOUR IMPACT DESERVES MORE THAN A PDF.",
      "Use your findings to shape a clearer narrative, stronger design or an accessible digital experience. My Social Impact and The Ideas Shed can help you improve the next edition. Completed results are available whenever they are ready.",
    ],
  ],
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
const reportLessonsV2 = [
  lessons.report[0],
  [
    "01 · Readability and hierarchy",
    "MAKE THE FINDINGS EASY TO FIND.",
    "Comfortable body text, purposeful editing and a clear opening help readers find outcomes quickly. Headings alone do not earn a high score.",
    "Separate actual outcomes from mission and ambition. Check ordinary-size legibility before enlarging the page.",
  ],
  lessons.report[2],
  [
    "03 · Visual design",
    "MAKE EVERY PAGE COUNT.",
    "We judge composition, typographic craft, rhythm, imagery and art direction. Consistent colours or the presence of graphics do not establish good execution.",
    "Purposeful, modest black-and-white design can be exceptional.",
  ],
  [
    "04 · Data communication",
    "HELP READERS UNDERSTAND THE EVIDENCE.",
    "Use appropriate representations, readable labels and clear denominators, periods and sources. Show the honest takeaway.",
    "A well-edited paragraph or simple table can work better than a decorative pie chart.",
  ],
  [
    "05 · Accessibility",
    "MAKE THE REPORT USABLE BY MORE PEOPLE.",
    "We inspect visible contrast, magnification, PDF structure and text alternatives. We distinguish verified checks from untested assistive behaviour.",
    "Appearance and a PDF tag flag cannot prove screen-reader usability. Untested criteria stay unassessable.",
  ],
  lessons.report[6],
];
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
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0),
    [direction, setDirection] = useState("forward"),
    [emailOpen, setEmailOpen] = useState(false),
    [results, setResults] = useState(searchParams.get("results") === "1"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lessonHeading = useRef<HTMLHeadingElement>(null);
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
                : "Make this your Impact Director."
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
                : "Save your work and return on any device."
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
            : r.full
              ? "Explore the methodology"
              : "Save your work & get the full report",
      primaryHref: !framework
        ? allDone
          ? "/reviews"
          : "#choose-review"
        : nextAfterResults && allDone
          ? "/reviews"
          : complete
            ? "#review-results"
            : r.full
              ? "#learning"
              : "#email-delivery",
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
            : () =>
                r.full
                  ? goStep(0)
                  : step === 0
                    ? document
                        .querySelector<HTMLInputElement>(
                          '#email-delivery input[name="email"]',
                        )
                        ?.focus()
                    : setEmailOpen(true),
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
    step,
    setAction,
  ]);
  function goStep(value: number) {
    setDirection(value < step ? "backward" : "forward");
    setStep(value);
    requestAnimationFrame(() => {
      lessonHeading.current?.focus({ preventScroll: true });
      document.querySelector(".lesson-scroll")?.scrollTo({ top: 0 });
    });
  }
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
          <strong>A useful headline snapshot: no email needed.</strong> The full
          detailed report is also free, delivered after email verification.
          {!r.emailEnabled &&
            "Email delivery is currently unavailable; you can still use all three headline reviews."}
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
                    ? "Readability and hierarchy. Storytelling. Visual design. Data communication. Accessibility."
                    : "Purpose. Leadership. Data. Delivery. Communications."}
              </p>
              <button
                className="button primary"
                disabled={busy}
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
  const currentLessons =
    framework === "report" &&
    isReportV2(r.version || r.result?.version || REPORT_VERSION)
      ? reportLessonsV2
      : lessons[framework];
  const lesson = currentLessons[step],
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
                  ? r.framework === "report"
                    ? r.stage === 16
                      ? "Inspecting rendered pages."
                      : r.stage >= 17
                        ? `Reviewing ${(isReportV2(r.version) ? reportPillars : ["Clarity", "Storytelling", "Design", "Engagement", "Communication"])[r.stage - 17] || "your findings"}.`
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
            {framework === "report" && (
              <CreativeCaveat version={r.result.version} />
            )}
            <ScoreCard
              framework={framework}
              score={r.result.scores[framework]!}
              version={r.result.version}
              rating={framework === "report" ? r.result.rating : undefined}
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
            {framework === "report" && !isReportV2(r.result.version) && (
              <div className="notice">
                <p>
                  This is your preserved v{r.result.version} assessment. The new
                  methodology uses revised pillars, weights and direct visual
                  scoring.
                </p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => choose("report")}
                >
                  Run The Impact Edit v2 on this report
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
                      {step + 1} / {currentLessons.length} · Learning
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
                  disabled={step === currentLessons.length - 1}
                  onClick={() => goStep(step + 1)}
                >
                  Next →
                </button>
              </nav>
              <div className="lesson-jump">
                {currentLessons.map((l, i) => (
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
              disabled={busy}
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
