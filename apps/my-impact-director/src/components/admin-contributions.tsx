"use client";
import { useEffect, useState } from "react";
import { api } from "./session";
type Data = {
  available: boolean;
  live: boolean;
  totals: { successful: string; gross: string; refunded: string; net: string };
  amounts: { amount_pence: number; count: string }[];
  payments: {
    id: string;
    created_at: string;
    updated_at: string;
    status: string;
    amount_pence: number;
    refunded_pence: number;
    checkout_id: string | null;
    payment_intent_id: string | null;
    merchant_name: string;
    name: string | null;
    email: string | null;
    title: string | null;
    review_id: string | null;
  }[];
};
const money = (value: number | string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    Number(value) / 100,
  );
export function AdminContributions() {
  const [data, setData] = useState<Data | null>(null),
    [test, setTest] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api("/api/admin/contributions?mode=" + (test ? "test" : "live"))
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [test]);
  return (
    <section className="result-section admin-contributions">
      <h2>
        Voluntary support ·{" "}
        {test ? "Stripe test records" : "live contributions"}
      </h2>
      <p>
        Separate from professional services and subscriptions. Stripe is the
        authoritative record for settlement, fees and refunds. These figures are
        gross contributions and refunds, not profit or bank payouts.
      </p>
      <label>
        <input
          type="checkbox"
          checked={test}
          onChange={(e) => setTest(e.target.checked)}
        />{" "}
        Show test-mode records separately
      </label>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading contributions…</p>}
      {data && (
        <>
          {!data.available && (
            <p className="notice">
              Public payments are disabled until the merchant configuration and
              Stripe test flow are verified.
            </p>
          )}
          <div className="metrics">
            {[
              ["Successful payments", data.totals.successful],
              ["Gross contributions", money(data.totals.gross)],
              ["Refunded", money(data.totals.refunded)],
              ["After refunds · before Stripe fees", money(data.totals.net)],
            ].map(([label, value]) => (
              <div className="metric" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p>
            By amount:{" "}
            {data.amounts.length
              ? data.amounts
                  .map((x) => `${money(x.amount_pence)} × ${x.count}`)
                  .join(" · ")
              : "No successful contributions recorded."}
          </p>
          <div className="contribution-table">
            <table className="admin-table">
              <caption>
                Latest 100 contributions · {test ? "test mode" : "live mode"}
              </caption>
              <thead>
                <tr>
                  {[
                    "When",
                    "Contribution",
                    "Status",
                    "Contributor / report",
                    "Stripe reference",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.created_at).toLocaleString("en-GB")}</td>
                    <td>
                      {money(p.amount_pence)}
                      {p.refunded_pence > 0 && (
                        <p>Refunded {money(p.refunded_pence)}</p>
                      )}
                      <small>{p.merchant_name}</small>
                    </td>
                    <td>{p.status.replaceAll("_", " ")}</td>
                    <td>
                      {p.name || "Private browser contributor"}
                      {p.email && <p>{p.email}</p>}
                      {p.review_id ? (
                        <p>
                          {p.title || "Assessment"}
                          <br />
                          <small>Assessment reference: {p.review_id}</small>
                        </p>
                      ) : (
                        <p>{p.title || "Report no longer retained"}</p>
                      )}
                    </td>
                    <td>
                      {p.payment_intent_id ? (
                        <a
                          href={`https://dashboard.stripe.com/${test ? "test/" : ""}payments/${p.payment_intent_id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p.payment_intent_id}
                        </a>
                      ) : (
                        p.checkout_id || "Opening checkout"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
