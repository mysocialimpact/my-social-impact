"use client";
import { pillarMaximum } from "@/lib/report-methodology";
import { useEffect, useState } from "react";
import { useSession, api } from "./session";
import { Account } from "./account";
import { ReviewResults } from "./review-results";
import { frameworkNames, type Framework } from "@/lib/rubric";
import { activeServices, serviceLabel } from "@/lib/services";
import type { ReviewResult } from "@/lib/pipeline";
type AdminData = {
  intents?: {
    id: string;
    action: string;
    source: string;
    review_id: string | null;
    created_at: string;
    name: string;
    email: string;
  }[];
  deliveries?: {
    email: string;
    title: string;
    framework: string;
    delivered_at: string | null;
    attempts: number;
  }[];
  usage: { event: string; count: string }[];
  metrics: Record<string, string>;
  users: {
    id: string;
    email_verified_at?: string | null;
    name: string;
    email: string;
    organisation: string;
    last_seen: string;
  }[];
  reviews: {
    id: string;
    status: string;
    stage: number;
    title: string;
    organisation: string;
    email: string;
    source_url: string | null;
    framework?: string;
    error_code: string | null;
    quality_consent: boolean;
    cost_usd: string;
    scores: ReviewResult["scores"] | null;
  }[];
  enquiries: {
    id: string;
    service: string;
    name: string;
    email: string;
    message: string;
    status: string;
    review_id: string | null;
    share_review: boolean;
  }[];
};
export function Admin() {
  const { user, loading, error: sessionError } = useSession(),
    [data, setData] = useState<AdminData | null>(null),
    [error, setError] = useState(""),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [enquiryService, setEnquiryService] = useState(""),
    [selected, setSelected] = useState<{
      id: string;
      title: string;
      result: ReviewResult | null;
      pages?: { page: number; text: string }[];
    } | null>(null),
    [reason, setReason] = useState(""),
    [inspectId, setInspectId] = useState("");
  async function refresh() {
    setError("");
    try {
      setData(
        await api(
          `/api/admin?q=${encodeURIComponent(q)}&status=${status}&service=${encodeURIComponent(enquiryService)}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    }
  }
  useEffect(() => {
    if (user?.founder) void refresh();
  }, [user]);
  if (loading) return <p role="status">Checking founder access…</p>;
  if (sessionError) return <div className="alert error">{sessionError}</div>;
  if (!user) return <Account next="/admin" />;
  if (!user.founder)
    return (
      <div className="alert error">
        This area is restricted to authorised founders.
      </div>
    );
  return (
    <>
      <div className="toolbar">
        <input
          aria-label="Search accounts, reports and enquiries"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search names, emails or reports"
        />
        <select
          aria-label="Review status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All review statuses</option>
          {["complete", "queued", "running", "failed"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Enquiry interest"
          value={enquiryService}
          onChange={(e) => setEnquiryService(e.target.value)}
        >
          <option value="">All enquiry interests</option>
          <option value="ongoing">All ongoing support</option>
          {activeServices.map(([key, value]) => (
            <option value={key} key={key}>
              {value.name}
            </option>
          ))}
          <option value="feedback">Product feedback</option>
        </select>
        <button className="button secondary small" onClick={refresh}>
          Search & refresh
        </button>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {data && (
        <>
          <div className="metrics">
            {[
              ["users", "Registered accounts"],
              ["uploads", "Reports uploaded / ingested"],
              ["organisations", "Reported organisations"],
              ["reviews", "Assessments"],
              ["completed", "Completed"],
              ["pending", "In progress"],
              ["failed", "Need attention"],
              ["enquiries", "Received service enquiries"],
              ["cost_usd", "Estimated AI spend · USD"],
            ].map(([k, label]) => (
              <div className="metric" key={k}>
                <strong>
                  {k === "cost_usd"
                    ? "$" + Number(data.metrics[k]).toFixed(2)
                    : data.metrics[k]}
                </strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="fine-print">
            Completion:{" "}
            {Number(data.metrics.reviews)
              ? (
                  (Number(data.metrics.completed) /
                    Number(data.metrics.reviews)) *
                  100
                ).toFixed(1)
              : "0"}
            %. {data.metrics.enquirers} accounts have made enquiries;{" "}
            {data.metrics.reviewed_users} accounts have completed reviews. Spend
            is an estimate based on recorded usage; interrupted requests may be
            missing.
          </p>
          <section className="result-section">
            <h2>Usage & commercial interest · last 30 days</h2>
            <p>
              Aggregate event totals, not unique people. Browser return counts
              use a local visit flag and may be incomplete. A completed report
              and its first view are each counted once.
            </p>
            <div className="metrics">
              {[
                ["anonymous_started", "Guest reviews started"],
                ["review_completed", "Reviews completed"],
                ["result_viewed", "Results opened"],

                ["enquiry_created", "Service enquiries received in this app"],
                ["service_cta_click", "Contact links clicked · intent only"],
                ["service_interest_discussion", "Free discussion interest"],
                ["service_interest_improvement", "Report improvement interest"],
                ["service_interest_digitisation", "Digitisation interest"],
                ["service_interest_preparation", "New report interest"],
                ["service_interest_human-director", "Ongoing support interest"],
                ["service_interest_supported", "Supported interest"],
                ["service_interest_director", "Director interest"],
                ["service_interest_bespoke", "Bespoke interest"],
                ["browser_session_started", "Browser sessions"],
                [
                  "returning_browser_session",
                  "Returning browser sessions · approximate",
                ],
                ["report_downloaded", "PDF downloads"],
                ["workspace_opened", "Workspace visits"],
                ["selected_claims", "Claims Code selected"],
                ["selected_excellence", "Excellence selected"],
                ["selected_report", "The Impact Edit selected"],
                ["snapshot_viewed", "Snapshots opened"],
                ["email_requested", "Verification emails requested"],
                ["email_saved", "Email verified"],
                [
                  "full_report_delivered",
                  "Full reports accepted by email service",
                ],
                ["feedback_created", "Feedback received"],
              ].map(([event, label]) => (
                <div className="metric" key={event}>
                  <strong>
                    {data.usage.find((x) => x.event === event)?.count || "0"}
                  </strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="result-section">
            <h2>Contact intent · not received enquiries</h2>
            <p>
              Email-link clicks do not confirm an email was sent. Anonymous
              clicks appear only in aggregate totals. Verified account interest
              appears below; review references are opt-in and grant no access to
              findings.
            </p>
            <p>
              Confirmed paid clients and revenue: not recorded by this
              application. No checkout or payment figures are inferred from
              interest.
            </p>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Interest</th>
                    <th>Review privacy</th>
                    <th>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {data.intents?.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.name}
                        <p>
                          <a href={"mailto:" + i.email}>{i.email}</a>
                        </p>
                      </td>
                      <td>
                        {serviceLabel(i.action.replace("service-intent:", ""))}
                        <p>{i.source} · email/contact intent only</p>
                      </td>
                      <td>
                        {i.review_id
                          ? "Review reference linked by choice; findings private"
                          : "No linked review"}
                      </td>
                      <td>
                        {new Date(i.created_at).toLocaleDateString("en-GB")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.intents?.length && (
              <p>No matching account-linked contact intent recorded.</p>
            )}
          </section>
          <section className="result-section">
            <h2>Reports & assessment quality</h2>
            <p>
              Detailed findings require the owner’s sharing consent and an audit
              reason.
            </p>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>
                      Report / account · organisation affiliation unverified
                    </th>
                    <th>Status</th>
                    <th>Scores</th>
                    <th>Cost</th>
                    <th>Quality review</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reviews.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.title}</strong>
                        <p>
                          {r.framework === "document"
                            ? "Document understanding"
                            : r.framework
                              ? frameworkNames[r.framework as Framework]
                              : "Legacy combined review"}
                        </p>
                        <p>{r.organisation}</p>
                        <p>{r.email}</p>
                        <small>
                          {r.source_url
                            ? "Publicly discovered"
                            : "Uploaded PDF"}
                        </small>
                      </td>
                      <td>
                        <span className={"badge " + r.status}>{r.status}</span>
                        <p>
                          {r.status === "complete"
                            ? "Complete"
                            : r.framework === "report"
                              ? r.stage === 16
                                ? "Visual page inspection"
                                : "Editorial assessment"
                              : `Stage ${r.stage}/15`}
                        </p>
                        <small>{r.error_code}</small>
                      </td>
                      <td>
                        {r.scores
                          ? `Claims ${r.scores.claims?.overall ?? "provisional"} · Excellence ${r.scores.excellence?.overall ?? "provisional"} · Report ${r.scores.report?.overall ?? "—"}`
                          : "Not yet assessed"}
                        {r.scores?.report?.principles.map((p) => (
                          <p key={p.name}>
                            {p.name}: {p.score ?? "Unassessable"}/
                            {pillarMaximum(p)}
                          </p>
                        ))}
                      </td>
                      <td>${Number(r.cost_usd).toFixed(3)}</td>
                      <td>
                        <button
                          className="button secondary small"
                          onClick={() => {
                            setInspectId(r.id);
                            setSelected(null);
                          }}
                        >
                          Inspect consent & findings
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.reviews.length && <p>No reports match this filter.</p>}
          </section>
          {inspectId && (
            <form
              className="admin-detail"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const d = await api("/api/admin/" + inspectId, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ reason }),
                  });
                  setSelected({ ...d, id: inspectId });
                  setInspectId("");
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Please try again.",
                  );
                }
              }}
            >
              <label>
                Reason for inspecting this assessment
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={10}
                  maxLength={500}
                  required
                />
              </label>
              <button className="button primary small">
                Check consent & record inspection
              </button>
            </form>
          )}
          {selected && (
            <div className="admin-detail">
              <div className="toolbar">
                <h3>{selected.title}</h3>
                <button
                  className="button secondary small"
                  onClick={() => setSelected(null)}
                >
                  Close inspection
                </button>
              </div>
              {selected.result ? (
                <ReviewResults
                  admin
                  id={selected.id}
                  result={selected.result}
                />
              ) : (
                <p>No completed result is available.</p>
              )}
              {selected.pages && (
                <section className="finding-content">
                  <h3>Extracted source pages for this consented inspection</h3>
                  {selected.pages.map((p) => (
                    <details key={p.page} id={`inspection-page-${p.page}`}>
                      <summary>PDF page {p.page}</summary>
                      <pre className="source-text">{p.text}</pre>
                    </details>
                  ))}
                </section>
              )}
            </div>
          )}
          <section className="result-section">
            <h2>Verified report delivery</h2>
            <p>
              Report organisations are extracted from documents. They do not
              establish the visitor’s organisational affiliation.
            </p>
            {data.deliveries?.map((d, i) => (
              <p key={i}>
                {d.email} · {d.title} · {d.framework} ·{" "}
                {d.delivered_at ? "Accepted by email service" : "Queued"} ·{" "}
                {d.attempts} attempts
              </p>
            ))}
          </section>
          <section className="result-section">
            <h2>Enquiries & product feedback</h2>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Service & message</th>
                    <th>Assessment consent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.enquiries.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.name}</strong>
                        <p>
                          {e.email ? (
                            <a href={"mailto:" + e.email}>{e.email}</a>
                          ) : (
                            "No contact details provided"
                          )}
                        </p>
                      </td>
                      <td>
                        <strong>{serviceLabel(e.service)}</strong>
                        <p>{e.message}</p>
                      </td>
                      <td>
                        {e.review_id
                          ? e.share_review
                            ? "Review shared with consent"
                            : "Review linked; details private"
                          : "No linked review"}
                        {e.review_id && e.share_review && (
                          <button
                            className="button secondary small"
                            onClick={() => {
                              setInspectId(e.review_id!);
                              setSelected(null);
                            }}
                          >
                            Inspect linked review
                          </button>
                        )}
                      </td>
                      <td>
                        <select
                          aria-label={`Enquiry status for ${e.name}`}
                          value={e.status}
                          onChange={async (event) => {
                            try {
                              await api("/api/admin", {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                  id: e.id,
                                  status: event.target.value,
                                }),
                              });
                              await refresh();
                            } catch (e) {
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : "Please try again.",
                              );
                            }
                          }}
                        >
                          {["new", "contacted", "closed"].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.enquiries.length && <p>No enquiries match this search.</p>}
          </section>
          <section className="result-section">
            <h2>Registered users</h2>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Organisation</th>
                    <th>Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>
                        {u.email}
                        <p>
                          {u.email_verified_at
                            ? "Email verified"
                            : "Verification not recorded"}
                        </p>
                      </td>
                      <td>{u.organisation || "Not supplied"}</td>
                      <td>
                        {new Date(u.last_seen).toLocaleDateString("en-GB")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
