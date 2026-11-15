"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, api } from "./session";
import { Account } from "./account";
import { Arrow, DocumentIcon } from "./icons";
type Row = {
  id: string;
  title: string;
  organisation: string;
  status: string;
  created_at: string;
  reporting_period: string | null;
};
export function SavedReviews() {
  const { user, loading, error: sessionError } = useSession(),
    [rows, setRows] = useState<Row[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    api("/api/reviews")
      .then((d) => setRows(d.reviews))
      .catch((e) => setError(e.message));
  }, [user]);
  if (loading) return <p role="status">Checking your account…</p>;
  if (sessionError) return <div className="alert error">{sessionError}</div>;
  if (!user) return <Account next="/reviews" />;
  return (
    <>
      <div className="dashboard-actions">
        <div>
          <p>Welcome, {user.name}.</p>
          {user.founder && (
            <Link href="/admin">Open founder control centre →</Link>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/review" className="button primary small">
            Review a report <Arrow />
          </Link>
          <button
            className="button secondary small"
            onClick={async () => {
              try {
                await api("/api/account", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: "logout" }),
                });
                window.location.assign("/");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Please try again.");
              }
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {!rows && !error ? (
        <p role="status">Loading your reviews…</p>
      ) : rows?.length ? (
        <div className="review-list">
          {rows.map((r) => (
            <Link href={"/reviews/" + r.id} className="review-item" key={r.id}>
              <div>
                <span className={"badge " + r.status}>{r.status}</span>
                <h3>{r.title}</h3>
                <p>
                  {r.organisation || "Organisation being identified"} ·{" "}
                  {r.reporting_period ||
                    new Date(r.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
              <Arrow />
            </Link>
          ))}
        </div>
      ) : (
        rows && (
          <div className="empty">
            <DocumentIcon />
            <h2>Your first fresh perspective starts here.</h2>
            <p>
              Upload or find an impact report. Your saved reviews will appear
              here.
            </p>
            <Link className="button primary" href="/review">
              Review my first report <Arrow />
            </Link>
          </div>
        )
      )}
    </>
  );
}
