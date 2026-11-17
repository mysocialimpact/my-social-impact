"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, useSession } from "./session";
import { FRAMEWORKS, frameworkNames, type Framework } from "@/lib/rubric";
import {
  stateLabel,
  stateAction,
  type Workspace,
  type AssessmentState,
} from "./workspace-types";
export function WorkspaceTracker() {
  const { user } = useSession();
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const strip = useRef<HTMLElement>(null);
  const path = usePathname();
  const id = path.match(/^\/reviews\/([0-9a-f-]{36})(?:\/|$)/i)?.[1];
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    let selected = false;
    async function refresh() {
      try {
        const d = await api(
          "/api/workspace",
          id && !selected
            ? {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ review: id }),
              }
            : undefined,
        );
        if (!stopped) {
          setWorkspace(d.workspace || null);
          selected = true;
          setError("");
        }
      } catch (e) {
        if (!stopped)
          setError(
            e instanceof Error ? e.message : "Unable to refresh status.",
          );
      }
      if (!stopped) timer = setTimeout(refresh, 10000);
    }
    const requested = () => {
      clearTimeout(timer);
      void refresh();
    };
    window.addEventListener("mid-workspace-refresh", requested);
    window.addEventListener("mid-review-refresh", requested);
    setWorkspace(null);
    void refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener("mid-workspace-refresh", requested);
      window.removeEventListener("mid-review-refresh", requested);
    };
  }, [id, path, user?.id]);
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        "--workspace-height",
        `${el.getBoundingClientRect().height}px`,
      );
    measure();
    const o = new ResizeObserver(measure);
    o.observe(el);
    return () => {
      o.disconnect();
      document.documentElement.style.removeProperty("--workspace-height");
    };
  }, [!!workspace]);
  async function start(f: Framework) {
    if (!workspace) return;
    if (!user || user.anonymous) {
      window.location.assign(
        `/login?mode=signup&next=${encodeURIComponent("/reviews/" + workspace.root_id)}`,
      );
      return;
    }
    setBusy(true);
    try {
      const d = await api("/api/reviews/" + workspace.root_id, {
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
  if (!workspace) return null;
  function entry(f: Framework, a?: AssessmentState) {
    const label = stateLabel(a);
    return (
      <div
        role="group"
        aria-label={frameworkNames[f]}
        className={
          "workspace-assessment state-" +
          label.toLowerCase().replaceAll(" ", "-")
        }
        key={f}
      >
        <span className="workspace-framework">
          <span className="workspace-framework-long">{frameworkNames[f]}</span>
          <span className="workspace-framework-short">
            {f === "claims"
              ? "Claims Code"
              : f === "excellence"
                ? "Impact management"
                : "The Impact Edit"}
          </span>
        </span>
        <strong>
          <span className="workspace-state-dot" aria-hidden="true" />
          {label}
        </strong>
        {a ? (
          <Link
            href={
              "/reviews/" + a.id + (label === "Completed" ? "?results=1" : "")
            }
            aria-label={`${stateAction(a)} — ${frameworkNames[f]}`}
            aria-current={path === "/reviews/" + a.id ? "page" : undefined}
          >
            {stateAction(a)}
          </Link>
        ) : (
          <button
            aria-label={`Start review — ${frameworkNames[f]}`}
            disabled={busy}
            onClick={() => start(f)}
          >
            {stateAction(a)}
          </button>
        )}
      </div>
    );
  }
  return (
    <section
      ref={strip}
      className="workspace-tracker"
      aria-label="Your Impact Director workspace"
      data-report={workspace.id}
    >
      <div className="workspace-heading">
        <Link href={"/reviews/" + workspace.root_id}>MY REPORTS</Link>
        <p title={workspace.title}>
          <span className="workspace-organisation">
            {workspace.organisation || "Your report"}
          </span>{" "}
          <span className="workspace-document">· {workspace.title}</span>
        </p>
      </div>
      <div
        className="workspace-assessments"
        aria-live="polite"
        aria-atomic="true"
      >
        {FRAMEWORKS.map((f) =>
          entry(
            f,
            workspace.assessments.find((a) => a.framework === f),
          ),
        )}
      </div>
      {error && (
        <p className="workspace-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
