"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useSession } from "./session";
import { SaveReview } from "./save-review";
import { FRAMEWORKS, frameworkNames, type Framework } from "@/lib/rubric";
import { stateLabel, stateAction, type Workspace } from "./workspace-types";
export function SavedReviews() {
  const { user, loading, error: sessionError } = useSession();
  const [rows, setRows] = useState<Workspace[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  useEffect(() => {
    if (loading) return;
    if (!user || user.anonymous) {
      setRows([]);
      return;
    }
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const d = await api("/api/reviews");
        if (!stopped) {
          setRows(d.workspaces || []);
          setError("");
        }
      } catch (e) {
        if (!stopped)
          setError(
            e instanceof Error ? e.message : "Unable to load your workspace.",
          );
      }
      if (!stopped) timer = setTimeout(refresh, 10000);
    }
    void refresh();
    void api("/api/workspace", { method: "POST" }).catch(() => {});
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [user, loading]);
  async function start(w: Workspace, f: Framework) {
    setBusy(w.id + f);
    setError("");
    try {
      const d = await api("/api/reviews/" + w.root_id, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ framework: f }),
      });
      window.location.assign("/reviews/" + d.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy("");
    }
  }
  async function remove(w: Workspace) {
    if (
      !confirm(
        "Delete this document and all three reviews? This cannot be undone.",
      )
    )
      return;
    setBusy(w.id);
    try {
      await api("/api/reviews/" + w.root_id, { method: "DELETE" });
      setRows((old) => old?.filter((r) => r.id !== w.id) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  if (loading)
    return (
      <section className="workspace-welcome">
        <div className="campaign-width">
          <p role="status">Opening your workspace…</p>
        </div>
      </section>
    );
  if (sessionError)
    return (
      <section className="workspace-welcome">
        <div className="campaign-width">
          <p className="eyebrow">YOUR PRIVATE WORKSPACE</p>
          <h1>
            We’ll get you
            <br />
            <em>back to work.</em>
          </h1>
          <p role="alert">{sessionError}</p>
          <button
            className="button primary"
            onClick={() =>
              window.dispatchEvent(new Event("mid-session-refresh"))
            }
          >
            Try opening my workspace again
          </button>
        </div>
      </section>
    );
  if (!user || user.anonymous)
    return (
      <section className="workspace-welcome">
        <div className="campaign-width welcome-columns">
          <div>
            <p className="eyebrow">YOUR PRIVATE WORKSPACE</p>
            <h1>
              My reports.
              <br />
              <em>Your next step.</em>
            </h1>
          </div>
          <div>
            <p className="welcome-lead">You’re not logged in yet.</p>
            <p>
              New here? Create your free account to start your first review.
              Already registered? Log in to find your reports, check progress
              and pick up where you left off.
            </p>
            <div className="welcome-actions">
              <Link href="/review" className="button primary">
                Start your first free review →
              </Link>
              <Link href="/login?next=%2Freviews" className="welcome-login">
                Log in to My Reports →
              </Link>
            </div>
            <p className="fine-print">
              One account. All your reviews. Ready when you are.
            </p>
          </div>
        </div>
      </section>
    );
  return (
    <>
      <section className="workspace-welcome">
        <div className="campaign-width welcome-columns">
          <div>
            <p className="eyebrow">YOUR PRIVATE WORKSPACE</p>
            <h1>
              My reports.
              <br />
              <em>Your impact.</em>
            </h1>
          </div>
          <div>
            <p className="welcome-lead">
              Welcome back{user.name ? `, ${user.name}` : ""}.
            </p>
            <p>
              Your reports, the reviews you’ve started, and what to do next. All
              in one place.
            </p>
            <Link href="/review" className="button primary">
              Start a new free review →
            </Link>
          </div>
        </div>
      </section>
      <div className="section reports-content">
        <div className="dashboard-actions">
          <div>
            <p>
              {user?.anonymous
                ? "Temporary workspace in this browser."
                : user
                  ? `Signed in as ${user.email}`
                  : "One upload. Three reviews. Your progress."}
            </p>
            {user?.founder && (
              <Link href="/admin">Founder control centre →</Link>
            )}
          </div>
          {user && !user.anonymous && <Link href="/account">Account →</Link>}
        </div>
        {(error || sessionError) && (
          <p className="alert error" role="alert">
            {error || sessionError}
          </p>
        )}
        {user && !user.anonymous && !user.emailVerified && (
          <SaveReview returning />
        )}
        {(!user || user.anonymous) && !loading && (
          <div className="workspace-return">
            <p>Log in to save and return on another device.</p>
            <Link href="/login">Log in</Link>
            <span> · </span>
            <Link href="/login?mode=signup">Create your free account</Link>
          </div>
        )}
        {user?.emailVerified && !user.passwordAccount && (
          <p className="workspace-return">
            Previously used an email link?{" "}
            <Link href="/account">Set a password for next time →</Link>
          </p>
        )}
        {loading || !rows ? (
          <p role="status">Opening your reports…</p>
        ) : !rows.length ? (
          <div className="reports-empty">
            <h2>Your reports start here.</h2>
            <p>
              Drop in your first PDF and let your Impact Director get to work.
              Your three reviews will appear here.
            </p>
            <Link href="/review" className="button primary">
              Upload a report →
            </Link>
          </div>
        ) : (
          <div className="personal-workspaces">
            {rows.map((w) => (
              <article className="personal-report" key={w.id}>
                <div className="personal-report-heading">
                  <div>
                    <p className="eyebrow">
                      {w.organisation || "YOUR UPLOADED DOCUMENT"}
                    </p>
                    <h2>
                      <Link href={"/reviews/" + w.root_id}>{w.title}</Link>
                    </h2>
                    <p>
                      {w.reporting_period || "Reporting period not identified"}{" "}
                      · Uploaded{" "}
                      {new Date(w.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <Link href={"/reviews/" + w.root_id}>Open workspace →</Link>
                </div>
                <div className="personal-assessments">
                  {FRAMEWORKS.map((f) => {
                    const a = w.assessments.find((a) => a.framework === f),
                      label = stateLabel(a);
                    return (
                      <section key={f}>
                        <h3>{frameworkNames[f]}</h3>
                        <p className="workspace-state">
                          {label}
                          {label === "Completed" && a?.score !== null
                            ? ` · ${a?.score}/100`
                            : ""}
                        </p>
                        {a ? (
                          <Link
                            className="text-link"
                            href={
                              "/reviews/" +
                              a.id +
                              (label === "Completed" ? "?results=1" : "")
                            }
                          >
                            {stateAction(a)} →
                          </Link>
                        ) : (
                          <button
                            className="text-link"
                            disabled={!!busy}
                            onClick={() => start(w, f)}
                          >
                            Start review →
                          </button>
                        )}
                        {a?.delivery && (
                          <p className="fine-print">
                            Email:{" "}
                            {a.delivery === "accepted"
                              ? "Accepted by email provider"
                              : a.delivery === "failed"
                                ? "Needs attention — open review to retry"
                                : "Preparing delivery"}
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
                <div className="workspace-retention">
                  <p>
                    {w.full ? "Saved report" : "Temporary browser access"} ·
                    Available until{" "}
                    {new Date(w.expires_at).toLocaleDateString("en-GB")}.{" "}
                    {user?.anonymous
                      ? "Verify your email to keep this report for 180 days and return on another device."
                      : ""}
                  </p>
                  {w.can_delete && (
                    <button
                      className="subtle-button"
                      disabled={!!busy}
                      onClick={() => remove(w)}
                    >
                      Delete document & reviews
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {user?.emailVerified && (
          <p className="workspace-service">
            <Link href="/#human-support">
              Want someone in your corner all year round? Meet your Impact
              Director →
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
