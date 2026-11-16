"use client";
import Link from "next/link";
import { useReportAction } from "./action-bar";
import { useEffect, useState } from "react";
import { api, useSession } from "./session";
import { SaveReview } from "./save-review";
import { FRAMEWORKS, frameworkNames, type Framework } from "@/lib/rubric";
import { stateLabel, stateAction, type Workspace } from "./workspace-types";
export function SavedReviews() {
  const setAction = useReportAction();
  const { user, loading, error: sessionError } = useSession();
  const [rows, setRows] = useState<Workspace[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  useEffect(() => {
    if (loading) return;
    if (!user) {
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
  useEffect(() => {
    const w = rows?.[0],
      count =
        w?.assessments.filter((a) => stateLabel(a) === "Completed").length || 0;
    setAction({
      id: "workspace",
      status: "complete",
      stage: 0,
      contextTitle: w
        ? count === 3
          ? "All three reviews complete."
          : `You’ve completed ${count} of 3 reviews.`
        : "Your personal Impact Director.",
      contextDetail: user?.emailVerified
        ? "Your reports are saved to this account."
        : "Try anonymously. Verify email to return on any device.",
      primaryLabel: w
        ? count === 3
          ? "Explore your reports"
          : "Continue your workspace"
        : "Start your first free review",
      primaryHref: w ? "/reviews/" + w.root_id : "/#upload",
    });
    return () => setAction(null);
  }, [rows, user?.emailVerified, setAction]);
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
  return (
    <>
      <div className="dashboard-actions">
        <div>
          <p>
            {user?.anonymous
              ? "Temporary workspace in this browser."
              : user
                ? `Signed in as ${user.email}`
                : "One upload. Three reviews. Your progress."}
          </p>
          {user?.founder && <Link href="/admin">Founder control centre →</Link>}
        </div>
        <div className="toolbar">
          <Link className="button primary small" href="/#upload">
            Upload a report →
          </Link>
          {user && !user.anonymous && (
            <button
              className="button secondary small"
              onClick={async () => {
                try {
                  await api("/api/account", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ action: "logout" }),
                  });
                  window.location.assign("/reviews");
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Please try again.",
                  );
                }
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>
      {(error || sessionError) && (
        <p className="alert error" role="alert">
          {error || sessionError}
        </p>
      )}
      {!user?.emailVerified && <SaveReview returning />}
      {loading || !rows ? (
        <p role="status">Opening your reports…</p>
      ) : !rows.length ? (
        <div className="empty">
          <h2>Your Impact Director starts here.</h2>
          <p>
            Upload your first report to begin, or use a secure email link to
            return to your saved work.
          </p>
          <Link href="/#upload" className="button primary">
            Review my report — free →
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
                    {w.reporting_period || "Reporting period not identified"} ·
                    Uploaded{" "}
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
                      {a && label === "Completed" && w.full && (
                        <p>
                          <a href={"/api/reviews/" + a.id + "/export"}>
                            Download PDF
                          </a>
                        </p>
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
          <Link href="/your-impact-director">
            Want someone in your corner all year round? Meet your Impact
            Director →
          </Link>
        </p>
      )}
    </>
  );
}
