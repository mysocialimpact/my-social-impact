"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, api } from "./session";
import { AdminContributions } from "./admin-contributions";
import { frameworkNames } from "@/lib/rubric";
type Row = Record<string, string | number | boolean | null>;
type Overview = {
  metrics: Row;
  frameworks: Row[];
  funnel: { count: number; rate: number | null; dropoff: number | null }[];
};
type Costs = {
  summary: Row[];
  daily: Row[];
  frameworks: Row[];
  documents: Row;
  assessments: Row[];
};
const tabs = [
  ["overview", "Overview"],
  ["accounts", "Accounts"],
  ["activity", "Activity"],
  ["reviews", "Reviews"],
  ["enquiries", "Enquiries"],
  ["payments", "Payments"],
  ["costs", "AI Costs"],
] as const;
type Section = (typeof tabs)[number][0];
const count = (v: unknown) => Number(v || 0).toLocaleString("en-GB"),
  usd = (v: unknown) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 4,
    }).format(Number(v || 0)),
  gbp = (v: unknown) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(Number(v || 0) / 100);
const date = (v: unknown) =>
  v
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Kampala",
      }).format(new Date(String(v)))
    : "—";
const framework = (v: unknown) =>
  frameworkNames[String(v) as keyof typeof frameworkNames] ||
  (v === "document"
    ? "Shared document preparation"
    : String(v || "Legacy assessment"));
export function FounderDashboard() {
  const { user, loading, error: sessionError } = useSession(),
    [section, setSection] = useState<Section>("overview"),
    [data, setData] = useState<Overview | Costs | Row[] | null>(null),
    [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [days, setDays] = useState(30),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [owner, setOwner] = useState(""),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!user?.founder || section === "payments") return;
    let active = true;
    setData(null);
    setError("");
    const params = new URLSearchParams({
      section,
      q: search,
      days: String(days),
      status,
      page: String(page),
      owner,
    });
    api("/api/founder?" + params)
      .then((d) => {
        if (active) setData(d.data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user?.founder, section, search, days, status, page, owner, refresh]);
  if (loading)
    return (
      <section className="section">
        <p role="status">Opening your Founder Dashboard…</p>
      </section>
    );
  if (!user || user.anonymous)
    return (
      <section className="founder-entry section">
        <p className="eyebrow">Founder access</p>
        <h1>
          Your view of
          <br />
          <em>the whole picture.</em>
        </h1>
        <p>Sign in with your verified Founder account to continue.</p>
        <Link className="button primary" href="/login?next=/founder">
          Sign in →
        </Link>
        {sessionError && <p role="alert">{sessionError}</p>}
      </section>
    );
  if (!user.founder)
    return (
      <section className="section">
        <h1>Your reports are ready for you.</h1>
        <p>This dashboard is restricted to the Founder account.</p>
        <Link href="/reviews">Go to My Reports →</Link>
      </section>
    );
  const rows = Array.isArray(data) ? data : [];
  return (
    <div className="founder-dashboard">
      <header className="founder-hero">
        <div>
          <p className="eyebrow">Founder Dashboard · My Impact Director</p>
          <h1>
            The whole <em>picture.</em>
          </h1>
          <p>People. Progress. Possibilities.</p>
        </div>
        <p>
          Private to your verified Founder account.
          <br />
          <span>{user.email}</span>
          <br />
          <small>
            Dates: Kampala · Financial records: GBP · AI estimates: USD
          </small>
        </p>
      </header>
      <nav className="founder-tabs" aria-label="Founder Dashboard sections">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            aria-current={section === key ? "page" : undefined}
            onClick={() => {
              if (key === section) return;
              setSection(key);
              setOwner("");
              setStatus("");
              setPage(1);
              setData(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="founder-body">
        <div className="founder-toolbar">
          <h2>{tabs.find((t) => t[0] === section)?.[1]}</h2>
          <div>
            {!["overview", "payments", "accounts"].includes(section) && (
              <label>
                Period{" "}
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={0}>All time</option>
                </select>
              </label>
            )}
            <button
              className="text-link"
              onClick={() => setRefresh((n) => n + 1)}
            >
              Refresh ↻
            </button>
          </div>
        </div>
        {owner && (
          <p className="alert">
            Showing the selected account’s records.{" "}
            <button className="text-link" onClick={() => setOwner("")}>
              Show all accounts
            </button>
          </p>
        )}
        {["accounts", "activity", "reviews", "enquiries"].includes(section) && (
          <form
            className="founder-filters"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(q);
              setPage(1);
            }}
          >
            <label>
              Search{" "}
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, email or report"
                maxLength={150}
              />
            </label>
            {["reviews", "enquiries"].includes(section) && (
              <label>
                Status{" "}
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {(section === "reviews"
                    ? ["queued", "running", "complete", "failed"]
                    : ["new", "contacted", "closed"]
                  ).map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
            <button className="button secondary">Search →</button>
          </form>
        )}
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        {!data && !error && section !== "payments" && (
          <p role="status">Loading the live figures…</p>
        )}
        {section === "overview" &&
          data &&
          !Array.isArray(data) &&
          "metrics" in data && <OverviewPanel data={data} />}
        {section === "accounts" && data && (
          <>
            <p className="fine-print">
              Known test accounts are archived separately. Ambiguous accounts
              are preserved pending review. An email is shown as verified only
              after ownership is confirmed.
            </p>
            <Table
              columns={[
                "Account",
                "Joined / active",
                "Sign-in",
                "Reports / assessments",
                "Enquiries / payments",
                "Latest activity",
                "Related records",
              ]}
            >
              {rows.map((r) => (
                <tr key={String(r.id)}>
                  <td>
                    <strong>{String(r.name || "Name not supplied")}</strong>
                    <br />
                    {String(r.email)}
                    <br />
                    <small>
                      {r.email_verified_at
                        ? "Verified email"
                        : "Email not verified"}{" "}
                      · {String(r.account_class)}
                      <br />
                      {String(r.organisation || "Organisation not supplied")}
                    </small>
                  </td>
                  <td>
                    {date(r.created_at)}
                    <br />
                    <small>Active {date(r.last_seen)}</small>
                  </td>
                  <td>
                    {String(
                      r.providers || r.last_auth_method || "Legacy / email",
                    )}
                  </td>
                  <td>
                    {count(r.reports)} / {count(r.assessments)}
                  </td>
                  <td>
                    {count(r.enquiries)} / {count(r.payments)}
                  </td>
                  <td>
                    {String(
                      r.latest_activity || "No tracked account event yet",
                    )}
                  </td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => {
                        setOwner(String(r.id));
                        setSection("reviews");
                        setSearch("");
                        setQ("");
                      }}
                    >
                      Reviews →
                    </button>
                    <br />
                    <button
                      className="text-link"
                      onClick={() => {
                        setOwner(String(r.id));
                        setSection("enquiries");
                        setSearch("");
                        setQ("");
                      }}
                    >
                      Enquiries →
                    </button>
                    <br />
                    <button
                      className="text-link"
                      onClick={() => {
                        setOwner(String(r.id));
                        setSection("payments");
                      }}
                    >
                      Payments →
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
            <div className="founder-pagination">
              <button
                className="text-link"
                disabled={page === 1}
                onClick={() => setPage((n) => n - 1)}
              >
                ← Previous
              </button>
              <span>
                Page {page} · {count(rows[0]?.total)} accounts
              </span>
              <button
                className="text-link"
                disabled={rows.length < 30}
                onClick={() => setPage((n) => n + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
        {section === "activity" && data && (
          <>
            <p className="fine-print">
              Latest 100 matching events. No report text, credentials or sign-in
              links are displayed.
            </p>
            <ol className="founder-timeline">
              {rows.map((r, i) => (
                <li key={`${r.resource}-${r.action}-${i}`}>
                  <time>{date(r.created_at)}</time>
                  <div>
                    <strong>{String(r.action).replaceAll("-", " ")}</strong>
                    <p>
                      {String(r.detail)} ·{" "}
                      {String(r.email || "Temporary visitor")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {!rows.length && <Empty />}
          </>
        )}
        {section === "reviews" && data && (
          <>
            <p className="fine-print">
              Latest 100 matching assessments. Detailed report contents require
              the owner’s sharing permission and an audited inspection reason.
            </p>
            <Table
              columns={[
                "Report / account",
                "Review",
                "Progress",
                "AI cost",
                "Updated",
                "Inspection",
              ]}
            >
              {rows.map((r) => (
                <tr key={String(r.id)}>
                  <td>
                    <strong>{String(r.title)}</strong>
                    <br />
                    {String(r.email)}
                  </td>
                  <td>{framework(r.framework)}</td>
                  <td>
                    <span className={`founder-status ${r.status}`}>
                      {String(r.status)}
                    </span>
                    <br />
                    <small>
                      {r.error_code ? String(r.error_code) : `Stage ${r.stage}`}
                    </small>
                  </td>
                  <td>{usd(r.cost_usd)}</td>
                  <td>{date(r.updated_at)}</td>
                  <td>
                    {r.inspection_allowed ? (
                      <Link href={`/admin?review=${r.id}`}>
                        Open consented inspection →
                      </Link>
                    ) : (
                      "Owner permission required"
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </>
        )}
        {section === "enquiries" && data && (
          <Table
            columns={["Contact", "Enquiry", "Received", "Status", "Conversion"]}
          >
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>
                  <strong>{String(r.name || "Name not supplied")}</strong>
                  <br />
                  {String(r.email)}
                </td>
                <td>
                  <strong>{String(r.service)}</strong>
                  <p className="founder-message">{String(r.message)}</p>
                </td>
                <td>{date(r.created_at)}</td>
                <td>
                  <select
                    aria-label={`Status for enquiry from ${r.email}`}
                    value={String(r.status)}
                    onChange={async (e) => {
                      try {
                        await api("/api/founder", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            id: r.id,
                            status: e.target.value,
                            converted: !!r.converted_at,
                          }),
                        });
                        setRefresh((n) => n + 1);
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Please try again.",
                        );
                      }
                    }}
                  >
                    {["new", "contacted", "closed"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="text-link"
                    onClick={async () => {
                      try {
                        await api("/api/founder", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            id: r.id,
                            status: r.status,
                            converted: !r.converted_at,
                          }),
                        });
                        setRefresh((n) => n + 1);
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Please try again.",
                        );
                      }
                    }}
                  >
                    {r.converted_at ? "Converted · undo" : "Mark converted"}
                  </button>
                  <small>{r.converted_at && date(r.converted_at)}</small>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {section === "payments" && (
          <AdminContributions key={refresh} owner={owner} />
        )}
        {section === "costs" &&
          data &&
          !Array.isArray(data) &&
          "summary" in data && <CostsPanel data={data} />}
      </div>
    </div>
  );
}
function Table({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div
      className="founder-table"
      tabIndex={0}
      role="region"
      aria-label={columns.join(", ")}
    >
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {Array.isArray(children) && !children.length && <Empty />}
    </div>
  );
}
function Empty() {
  return (
    <p className="founder-empty">
      Nothing here yet. New activity will appear as people use My Impact
      Director.
    </p>
  );
}
function OverviewPanel({ data }: { data: Overview }) {
  const m = data.metrics;
  return (
    <>
      <div className="founder-metrics">
        {[
          ["Registered accounts", m.accounts],
          ["New today", m.today],
          ["New this week", m.week],
          ["New this month", m.month],
          ["Active in 30 days", m.active],
          ["Reports uploaded", m.uploads],
          ["Assessments started", m.started],
          ["Assessments complete", m.completed],
          ["Assessments failed", m.failed],
          ["Service enquiries", m.enquiries],
          ["Marked converted", m.conversions],
          ["Live payments", m.payments],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <span>{String(label)}</span>
            <strong>{count(value)}</strong>
          </div>
        ))}
      </div>
      <div className="founder-financials">
        <div>
          <span>Live support received</span>
          <strong>{gbp(m.gross_pence)}</strong>
        </div>
        <div>
          <span>Refunds</span>
          <strong>{gbp(m.refunded_pence)}</strong>
        </div>
        <div>
          <span>After refunds, before Stripe fees</span>
          <strong>
            {gbp(Number(m.gross_pence) - Number(m.refunded_pence))}
          </strong>
        </div>
        <div>
          <span>Recorded AI costs · includes tests</span>
          <strong>{usd(m.ai_cost_usd)}</strong>
        </div>
      </div>
      <p className="fine-print">
        Accounts and report totals exclude classified tests and retired
        workspaces; linked identities count once. Active means a signed-in
        account seen within 30 days. Payment figures include only confirmed live
        contributions, including later refunds. They are not service invoices,
        profit or bank payouts.
      </p>
      <section className="founder-panel">
        <p className="eyebrow">The journey</p>
        <h3>From first visit to next step.</h3>
        <p>
          <strong>{count(m.visitor_sessions)}</strong> recorded browser
          sessions. Sessions are not unique people and include historic test
          visits.
        </p>
        <div className="founder-funnel">
          {data.funnel.map((r, i) => (
            <div key={i}>
              <span>
                {
                  [
                    "Registered",
                    "Uploaded",
                    "Completed review",
                    "Service enquiry",
                    "Paying contributor",
                  ][i]
                }
              </span>
              <strong>{count(r.count)}</strong>
              <div
                className="funnel-bar"
                style={{
                  width: `${Math.max(2, (r.count / Math.max(1, data.funnel[0].count)) * 100)}%`,
                }}
              />
              {i > 0 && (
                <small>
                  {r.rate === null
                    ? "No previous-stage accounts"
                    : `${r.rate}% progressed · ${r.dropoff} have not progressed`}
                </small>
              )}
            </div>
          ))}
        </div>
        <p className="fine-print">
          This is a sequential registered-account cohort: each stage must occur
          after the previous stage. Payments cover voluntary contributions
          recorded here. Visitor sessions are shown separately because they
          cannot reliably be matched to unique people.
        </p>
      </section>
      <section className="founder-panel">
        <h3>Three perspectives. Real progress.</h3>
        <Table columns={["Assessment", "Completed", "Preparing", "Failed"]}>
          {data.frameworks.map((r) => (
            <tr key={String(r.framework)}>
              <td>{framework(r.framework)}</td>
              <td>{count(r.completed)}</td>
              <td>{count(r.preparing)}</td>
              <td>{count(r.failed)}</td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}
function CostsPanel({ data }: { data: Costs }) {
  return (
    <>
      <p>
        Direct OpenAI processing. Includes validation, tests, retries and
        charged failures recorded in this database.
      </p>
      <p className="fine-print">
        USD costs are estimates from recorded tokens and configured model
        prices, not an OpenAI invoice. Historical missing-token records are
        identified below. No gateway fallback. Shared document preparation is
        counted once, separately from each framework.
      </p>
      <Table
        columns={[
          "Model",
          "Requests",
          "Input tokens",
          "Output tokens",
          "Estimated cost",
          "Errors / incomplete token records",
        ]}
      >
        {data.summary.map((r) => (
          <tr key={String(r.model)}>
            <td>{String(r.model)}</td>
            <td>{count(r.requests)}</td>
            <td>{count(r.input_tokens)}</td>
            <td>{count(r.output_tokens)}</td>
            <td>{usd(r.cost_usd)}</td>
            <td>
              {count(r.errors)} / {count(r.missing_token_records)}
            </td>
          </tr>
        ))}
      </Table>
      <section className="founder-panel">
        <h3>Cost by assessment.</h3>
        <Table
          columns={[
            "Framework",
            "Assessments",
            "Completed",
            "Total cost",
            "Cost / completion",
          ]}
        >
          {data.frameworks.map((r) => (
            <tr key={String(r.framework)}>
              <td>{framework(r.framework)}</td>
              <td>{count(r.reviews)}</td>
              <td>{count(r.completed)}</td>
              <td>{usd(r.cost_usd)}</td>
              <td>
                {Number(r.completed)
                  ? usd(Number(r.cost_usd) / Number(r.completed))
                  : "—"}
              </td>
            </tr>
          ))}
        </Table>
        <p>
          {count(data.documents.completed_documents)} documents have all three
          completed reviews. Total recorded cost: {usd(data.documents.cost_usd)}
          . Average:{" "}
          {Number(data.documents.completed_documents)
            ? usd(
                Number(data.documents.cost_usd) /
                  Number(data.documents.completed_documents),
              )
            : "—"}
          .
        </p>
        <p className="fine-print">
          Cost per completion includes unsuccessful attempts in the selected
          cohort. Shared preparation and historical legacy assessments are
          reported separately.
        </p>
      </section>
      <details className="founder-panel">
        <summary>Daily spend and errors</summary>
        <Table columns={["Day · Kampala", "Requests", "Cost", "Errors"]}>
          {data.daily.map((r) => (
            <tr key={String(r.day)}>
              <td>
                {new Date(String(r.day)).toLocaleDateString("en-GB", {
                  timeZone: "Africa/Kampala",
                })}
              </td>
              <td>{count(r.requests)}</td>
              <td>{usd(r.cost_usd)}</td>
              <td>{count(r.errors)}</td>
            </tr>
          ))}
        </Table>
      </details>
      <details className="founder-panel">
        <summary>Individual assessments · latest 50</summary>
        <Table
          columns={[
            "Report",
            "Assessment",
            "Status",
            "Tokens in / out",
            "Cost",
          ]}
        >
          {data.assessments.map((r) => (
            <tr key={String(r.id)}>
              <td>{String(r.title)}</td>
              <td>{framework(r.framework)}</td>
              <td>{String(r.status)}</td>
              <td>
                {count(r.input_tokens)} / {count(r.output_tokens)}
              </td>
              <td>{usd(r.cost_usd)}</td>
            </tr>
          ))}
        </Table>
      </details>
    </>
  );
}
