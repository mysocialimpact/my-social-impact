"use client";
import { useEffect, useState } from "react";
import { api } from "./session";
type Group = { label: string; count: number; average?: string };
type Item = {
  id: string;
  revision: number;
  created_at: string;
  rating: number | null;
  comment: string;
  page: string;
  framework: string;
  section: string;
  methodology: string;
  models: string;
  signed_in: boolean | null;
  review_id: string;
  status: string;
  priority: string;
  decision: string;
  draft: string;
  email: string;
  analysis_state: string;
  human_attention: boolean;
  analysis: {
    categories: string[];
    theme: string;
    summary: string;
    improvement: string;
  } | null;
  reply_state: string;
  notification_state: string;
  history:
    { actor: string; action: string; reason: string; time: string }[] | null;
};
type Inbox = {
  capability?: { model: string; status: string; checked: string };
  metrics: Record<string, number | string | null>;
  items: Item[];
  trend: Group[];
  pages: Group[];
  frameworks: Group[];
  themes: {
    theme: string;
    category: string;
    count: number;
    summary: string;
    improvement: string;
  }[];
};
const statuses = ["new", "reviewed", "actioned", "resolved"];
function Editor({ item, refresh }: { item: Item; refresh: () => void }) {
  const [draft, setDraft] = useState(item.draft),
    [decision, setDecision] = useState(item.decision),
    [priority, setPriority] = useState(item.priority),
    [status, setStatus] = useState(item.status),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(action: string) {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          revision: item.revision,
          draft,
          decision,
          status,
          priority,
          action,
        }),
      });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="learning-item">
      <summary>
        <span>
          <b>{item.rating ? item.rating + " / 5" : "Comment"}</b> · {item.page}{" "}
          · {new Date(item.created_at).toLocaleDateString("en-GB")}
        </span>
        <strong>{item.comment || "Rating only"}</strong>
        <small>
          {[
            item.status,
            item.human_attention ? "Needs attention" : "",
            item.email ? "Reply requested" : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </summary>
      <div className="learning-detail">
        <p>{item.comment}</p>
        <p>
          {[
            item.framework,
            item.section,
            item.methodology,
            item.models,
            item.review_id,
            item.signed_in === null
              ? "Historical record"
              : item.signed_in
                ? "Signed in"
                : "Anonymous",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {item.analysis ? (
          <div>
            <strong>
              {item.analysis.categories.join(", ")} · {item.analysis.theme}
            </strong>
            <p>{item.analysis.summary}</p>
            <p>{item.analysis.improvement}</p>
          </div>
        ) : (
          <p>Analysis · {item.analysis_state.replaceAll("_", " ")}</p>
        )}
        <div className="learning-filter">
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statuses.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {["normal", "high", "urgent"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Decision or action
          <textarea
            value={decision}
            maxLength={1500}
            onChange={(e) => setDecision(e.target.value)}
          />
        </label>
        {item.email && (
          <label>
            {item.reply_state ? "Approved reply" : "Reply draft"} · {item.email}
            <textarea
              value={draft}
              disabled={!!item.reply_state}
              maxLength={3000}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
        )}
        <p>
          Founder notification ·{" "}
          {item.notification_state || "Historical record"}
          {item.email &&
            " | Reply · " +
              (item.reply_state || (draft ? "drafted" : "requested"))}
        </p>
        <div className="learning-buttons">
          <button disabled={busy} onClick={() => save("save")}>
            Save changes
          </button>
          {item.email && !item.reply_state && (
            <button
              disabled={!draft.trim() || busy}
              onClick={() => save("approve")}
            >
              Approve and send reply
            </button>
          )}
          {!["running", "pending", "complete", "skipped"].includes(
            item.analysis_state,
          ) && (
            <button disabled={busy} onClick={() => save("retry-analysis")}>
              Retry analysis
            </button>
          )}
        </div>
        {error && <p role="alert">{error}</p>}
        {item.history?.map((h, i) => (
          <p key={i}>
            <small>
              {new Date(h.time).toLocaleString("en-GB")} · {h.actor} ·{" "}
              {h.action} · {h.reason}
            </small>
          </p>
        ))}
      </div>
    </details>
  );
}
export function AdminFeedback() {
  const [filters, setFilters] = useState<Record<string, string>>({}),
    [offset, setOffset] = useState(0),
    [epoch, setEpoch] = useState(0),
    [data, setData] = useState<Inbox | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setError("");
    api(
      "/api/admin/feedback?" +
        new URLSearchParams({ ...filters, offset: String(offset) }),
    )
      .then((d) => {
        if (current) setData(d);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [filters, offset, epoch]);
  const choices: Record<string, string[]> = {
    rating: ["1", "2", "3", "4", "5"],
    page: data?.pages.map((g) => g.label) || [],
    framework: data?.frameworks.map((g) => g.label) || [],
    category: ["praise", "criticism", "bug", "suggestion", "question"],
    status: statuses,
    response: ["attention", "requested", "drafted", "responded", "none"],
  };
  return (
    <section id="feedback-learning" className="learning-panel">
      <h2>
        Feedback <em>&amp; learning</em>
      </h2>
      <div className="learning-filter">
        {Object.entries(choices).map(([k, options]) => (
          <label key={k}>
            {k}
            <select
              value={filters[k] || ""}
              onChange={(e) => {
                setFilters({ ...filters, [k]: e.target.value });
                setOffset(0);
              }}
            >
              <option value="">All</option>
              {options.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert">
          {error} <button onClick={() => setEpoch(epoch + 1)}>Reload</button>
        </p>
      )}
      {data ? (
        <>
          <dl className="learning-metrics">
            {Object.entries(data.metrics).map(([name, v]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{v ?? "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="learning-stats">
            <div>
              <h3>Weekly ratings</h3>
              {data.trend.length ? (
                data.trend.map((g) => (
                  <p key={g.label}>
                    {g.label}{" "}
                    <meter min="0" max="5" value={Number(g.average)} />{" "}
                    {g.average}/5 ({g.count})
                  </p>
                ))
              ) : (
                <p>No ratings in the last twelve weeks.</p>
              )}
            </div>
            <div>
              <h3>All pages &amp; frameworks</h3>
              {[...data.pages, ...data.frameworks].map((g) => (
                <p key={g.label}>
                  {g.label} · {g.count}
                </p>
              ))}
            </div>
          </div>
          <h3>Recurring themes</h3>
          {data.capability && (
            <p>
              <small>
                Analysis model · {data.capability.model} ·{" "}
                {data.capability.status} · checked{" "}
                {new Date(data.capability.checked).toLocaleString("en-GB")}
              </small>
            </p>
          )}
          {data.themes.length ? (
            data.themes.map((t) => (
              <details key={t.theme + t.category}>
                <summary>
                  {t.theme} · {t.category} ({t.count})
                </summary>
                <p>{t.summary}</p>
                <p>{t.improvement}</p>
              </details>
            ))
          ) : (
            <p>Themes appear when written feedback has been analysed.</p>
          )}
          <h3>Recent feedback</h3>
          {data.items.map((item) => (
            <Editor
              key={item.id + ":" + item.revision}
              item={item}
              refresh={() => setEpoch((n) => n + 1)}
            />
          ))}
          {!data.items.length && <p>No feedback matches these filters.</p>}
          {(offset > 0 || offset + 25 < Number(data.metrics.total)) && (
            <div className="learning-buttons">
              <button disabled={!offset} onClick={() => setOffset(offset - 25)}>
                Previous
              </button>
              <button
                disabled={offset + 25 >= Number(data.metrics.total)}
                onClick={() => setOffset(offset + 25)}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        !error && <p role="status">Loading feedback…</p>
      )}
    </section>
  );
}
