"use client";
import { ShareReview } from "./share-review";
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
  siblings: {
    id: string;
    framework: Framework;
    status: string;
    has_result?: boolean;
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
  return (
    <section
      className="review-account-invitation"
      id={modal ? undefined : "email-delivery"}
    >
      <SaveReview id={id} />
      {full && delivery?.state === "failed" && (
        <p className="alert">
          Email delivery needs attention. You can download your full report from
          the results below.
        </p>
      )}
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
  const siblings = (r.siblings || []).map((s) =>
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
                : "Headline results now. Full reports free with a verified account."
              : r.full
                ? "We’ll email you when it’s ready."
                : "Save your work and return on any device."
            : "Choose any review. We reuse this document.",
      primaryLabel: !framework
        ? allDone
          ? "Explore your reports"
          : completedCount
            ? "Start your next free review"
            : "Start your first free review"
        : complete
          ? nextAfterResults
            ? allDone
              ? "Explore your reports"
              : "Start your next free review"
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
          detailed report is also free. Create an account and confirm your email
          to save, download, share and return to it.
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
                    ? "Clarity. Storytelling. Design. Engagement. Communication."
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
                        ? `Reviewing ${["Clarity", "Storytelling", "Design", "Engagement", "Communication"][r.stage - 17] || "your findings"}.`
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
            {framework === "report" && <CreativeCaveat />}
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
                <ShareReview id={r.id} />
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
                      Create your free account to save your work and receive
                      your full report. Or stay and explore your free snapshot.
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
      {complete && results && framework === "report" && (
        <section className="bigger-conversation">
          <h2>Let’s make your next impact report better.</h2>
          <p>
            Professional editing, copywriting and creative guidance from My
            Social Impact, with digital and creative technology from The Ideas
            Shed.
          </p>
          <p>
            <Link href={`/services/expert-review?review=${r.id}#enquire`}>
              Improve your report →
            </Link>
          </p>
          <p>
            <Link href={`/services/preparation?review=${r.id}#enquire`}>
              Create your next report →
            </Link>
          </p>
          <p>
            <Link href={`/services/digitisation?review=${r.id}#enquire`}>
              Bring your report to life →
            </Link>
          </p>
          <Link href="mailto:marcus@mysocialimpact.org">Talk to Marcus →</Link>
        </section>
      )}
      {complete && results && (
        <section className="bigger-conversation">
          <p className="eyebrow">
            IMPACT ISN’T SOMETHING YOU MANAGE ONCE A YEAR.
          </p>
          <h2>
            {framework === "claims"
              ? "Want someone to help you strengthen your next report?"
              : "What if someone helped you manage this throughout the year?"}
          </h2>
          <p>
            You’ve reviewed your impact report. Now imagine having someone help
            you improve your impact all year round. A real person who knows your
            organisation, helps you interpret the evidence and keeps you moving
            forward.
          </p>
          <p>
            Social Impact Excellence brings impact into regular management
            conversations, decisions and learning. Your Impact Director helps
            you put it into practice, with intelligent technology behind the
            scenes.
          </p>
          <Link
            className="button primary"
            href={`/your-impact-director?review=${r.id}`}
          >
            Meet your Impact Director <Arrow diagonal />
          </Link>
          <p>
            Human support from an indicative £149 per month; a more hands-on
            Director service from £495. Scope and involvement agreed together.
          </p>
          <p>
            <Link href={`/services/expert-review?review=${r.id}#enquire`}>
              Discuss this report
            </Link>{" "}
            ·{" "}
            <Link href={`/services/preparation?review=${r.id}#enquire`}>
              Create your next report
            </Link>{" "}
            ·{" "}
            <Link href={`/services/digitisation?review=${r.id}#enquire`}>
              Digitise your report
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
