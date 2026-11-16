"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, api } from "./session";
import { Account } from "./account";
import { SaveReview } from "./save-review";
import { Arrow, DocumentIcon } from "./icons";
type Row = {
  framework?: string;
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
    if (loading) return;
    if (!user) {
      setRows([]);
      return;
    }
    api("/api/reviews")
      .then((d) => setRows(d.reviews))
      .catch((e) => setError(e.message));
  }, [user, loading]);
  return (
    <>
      <div className="dashboard-actions">
        <div>
          <p>
            {user?.anonymous
              ? "Private reviews from this browser."
              : user
                ? `Signed in as ${user.email}`
                : "Your reviews, on your terms."}
          </p>
          {user?.founder && (
            <Link href="/admin">Open founder control centre →</Link>
          )}
        </div>
        <div className="toolbar">
          <Link href="/#upload" className="button primary small">
            Review a report
            <Arrow />
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
                  window.location.assign("/");
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
      {loading || !rows ? (
        <p role="status">Looking for your reviews…</p>
      ) : rows.length ? (
        <div className="review-list">
          {rows.map((r) => (
            <Link href={"/reviews/" + r.id} className="review-item" key={r.id}>
              <div>
                <span className={"badge " + r.status}>
                  {r.framework === "document"
                    ? r.status === "complete"
                      ? "Document understood — choose or return to a review"
                      : "Reading your document"
                    : r.framework
                      ? `${r.framework === "claims" ? "Claims Code" : r.framework === "report" ? "Report Excellence" : "Excellence"} · ${r.status}`
                      : r.status}
                </span>
                <h3>{r.title}</h3>
                <p>
                  {r.organisation || "Getting to know the report"} ·{" "}
                  {r.reporting_period ||
                    new Date(r.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
              <Arrow />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <DocumentIcon />
          <h2>A fresh perspective starts with your report.</h2>
          <p>
            No reviews in this browser yet. Upload a PDF to begin, or use an
            email link to return to a saved review.
          </p>
          <Link className="text-link" href="/#upload">
            Review my report — free
            <Arrow />
          </Link>
        </div>
      )}
      <SaveReview returning />
      <details className="existing-account">
        <summary>Already have a My Social Impact account?</summary>
        <Account next="/reviews" />
      </details>
    </>
  );
}
