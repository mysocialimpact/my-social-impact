"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  assessmentTierNames,
  assessmentTiers,
  type AssessmentTier,
} from "@/lib/assessment-pricing";
import { frameworkNames, type Framework } from "@/lib/rubric";
import { api } from "./session";

type Promotion = {
  code: string;
  stripe_code_id: string | null;
  discount_pence: number;
  max_redemptions: number;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
  eligibility: "any" | "first_human_purchase";
  redeemed: number;
  reserved: number;
};
type Credit = {
  id: string;
  report_id: string;
  framework: Framework;
  qualifying: number;
  applied_pence: number | null;
  project_ref: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
};
type Overview = {
  tiers: {
    tier: AssessmentTier;
    completed: number;
    customers: number;
    reports_purchased: number;
    gross: number;
    refunded: number;
    disputed: number;
    stripe_fees: number;
    unknown_fees: number;
  }[];
  promotions: Promotion[];
  credits: Credit[];
  funnel: { reports_viewed: number; projects_commissioned: number };
};

const endpoint = "/api/admin/assessment-commerce";
const moneyFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});
const money = (pence: number) => moneyFormat.format(pence / 100);
const creditStatus: Record<string, string> = {
  available: "Outstanding",
  expired: "Expired",
  redeemed: "Redeemed",
  suspended: "Payment balance under review",
  reconcile: "Invoice reconciliation needed",
};

function datetimeInput(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function PromotionForm({
  promotion,
  submit,
  busy,
}: {
  promotion?: Promotion;
  submit: (payload: object) => Promise<void>;
  busy: boolean;
}) {
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await submit({
      action: "promotion",
      code: promotion?.code ?? data.get("code"),
      stripeCodeId: String(data.get("stripe") || "").trim() || null,
      discount: Math.round(Number(data.get("discount")) * 100),
      limit: Number(data.get("limit")),
      starts: new Date(String(data.get("starts"))).toISOString(),
      ends: data.get("ends")
        ? new Date(String(data.get("ends"))).toISOString()
        : null,
      eligibility: data.get("eligibility"),
      active: data.get("active") === "on",
    });
  }
  return (
    <form onSubmit={save}>
      {!promotion && (
        <label>
          Code{" "}
          <input
            name="code"
            required
            maxLength={32}
            pattern="[a-zA-Z0-9_\x2d]{3,32}"
          />
        </label>
      )}
      <label>
        Stripe promotion ID{" "}
        <input
          name="stripe"
          defaultValue={promotion?.stripe_code_id ?? ""}
          placeholder="promo_…"
        />
      </label>
      <label>
        Discount in GBP{" "}
        <input
          name="discount"
          type="number"
          min="0.01"
          max="119"
          step="0.01"
          defaultValue={promotion ? promotion.discount_pence / 100 : 50}
          required
        />
      </label>
      <label>
        Completed purchase limit{" "}
        <input
          name="limit"
          type="number"
          min="1"
          step="1"
          defaultValue={promotion?.max_redemptions ?? 20}
          required
        />
      </label>
      <label>
        Start date and time{" "}
        <input
          name="starts"
          type="datetime-local"
          defaultValue={datetimeInput(
            promotion?.starts_at ?? new Date().toISOString(),
          )}
          required
        />
      </label>
      <label>
        End date and time{" "}
        <input
          name="ends"
          type="datetime-local"
          defaultValue={
            promotion?.ends_at ? datetimeInput(promotion.ends_at) : ""
          }
        />
      </label>
      <label>
        Eligibility
        <select
          name="eligibility"
          defaultValue={promotion?.eligibility ?? "first_human_purchase"}
        >
          <option value="first_human_purchase">
            First Human Intelligence purchase
          </option>
          <option value="any">Any eligible Human Intelligence purchase</option>
        </select>
      </label>
      <label>
        <input
          name="active"
          type="checkbox"
          defaultChecked={promotion?.active ?? false}
        />{" "}
        Active in the Sandbox
      </label>
      <button className="button secondary" disabled={busy}>
        {busy ? "Saving…" : "Save promotion"}
      </button>
    </form>
  );
}

export function AssessmentCommerceAdmin() {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await api(endpoint, { signal });
      if (!signal?.aborted) setData(response);
    } catch (e) {
      if (!signal?.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Couldn’t load the assessment ledger.",
        );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  async function submit(payload: object) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setMessage(
        result.saved
          ? "Promotion saved."
          : `${money(result.applied)} recorded against the project. Remaining fee ${money(result.remaining)}.`,
      );
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The change could not be confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function redeem(event: FormEvent<HTMLFormElement>, credit: Credit) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit({
      action: "redeem",
      id: credit.id,
      projectRef: form.get("reference"),
      projectFee: Math.round(Number(form.get("fee")) * 100),
      commissionedAt: new Date(String(form.get("commissioned"))).toISOString(),
    });
  }

  return (
    <section
      className="result-section"
      aria-labelledby="assessment-commerce-title"
    >
      <h2 id="assessment-commerce-title">Assessment commerce</h2>
      <p>Stripe Sandbox records. Dates in the forms use your local time.</p>
      {loading && <p role="status">Refreshing the ledger…</p>}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <button
        className="button secondary small"
        type="button"
        disabled={loading || busy}
        onClick={() => void refresh()}
      >
        Refresh assessment ledger
      </button>
      {data && (
        <>
          <h3>Assessment and project activity</h3>
          <p>
            Free reports viewed {data.funnel.reports_viewed}. Qualifying
            projects with credit recorded {data.funnel.projects_commissioned}.
            Appointment totals will be available when booking is connected.
          </p>
          <div className="contribution-table">
            <table className="admin-table">
              <caption>Payments by assessment tier</caption>
              <thead>
                <tr>
                  {[
                    "Tier",
                    "Completed",
                    "Purchasing accounts",
                    "Reports purchased",
                    "Gross",
                    "Refunded",
                    "Blocked by disputes",
                    "Recorded Stripe fees",
                  ].map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assessmentTiers.map((tier) => {
                  const row = data.tiers.find((entry) => entry.tier === tier);
                  return (
                    <tr key={tier}>
                      <th scope="row">{assessmentTierNames[tier]}</th>
                      <td>{row?.completed ?? 0}</td>
                      <td>{row?.customers ?? 0}</td>
                      <td>{row?.reports_purchased ?? 0}</td>
                      <td>{money(row?.gross ?? 0)}</td>
                      <td>{money(row?.refunded ?? 0)}</td>
                      <td>{money(row?.disputed ?? 0)}</td>
                      <td>
                        {money(row?.stripe_fees ?? 0)}
                        {row?.unknown_fees
                          ? ` (${row.unknown_fees} pending)`
                          : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <h3>Promotions</h3>
          {data.promotions.map((promotion) => (
            <details key={promotion.code}>
              <summary>
                {promotion.code} · {money(promotion.discount_pence)} off ·{" "}
                {promotion.redeemed} of {promotion.max_redemptions} completed ·{" "}
                {promotion.reserved} reserved ·{" "}
                {promotion.active ? "active" : "inactive"}
              </summary>
              <PromotionForm
                key={JSON.stringify(promotion)}
                promotion={promotion}
                submit={submit}
                busy={busy}
              />
            </details>
          ))}
          <details>
            <summary>Add a Human Intelligence promotion</summary>
            <PromotionForm submit={submit} busy={busy} />
          </details>
          <h3>Future-project credits</h3>
          {data.credits.length === 0 && <p>No credits recorded yet.</p>}
          {data.credits.map((credit) => (
            <details key={credit.id}>
              <summary>
                {frameworkNames[credit.framework]} ·{" "}
                {creditStatus[credit.status]} ·{" "}
                {money(credit.applied_pence ?? credit.qualifying)}
              </summary>
              <p>
                Report reference {credit.report_id}. Commissioning deadline{" "}
                {new Date(credit.ends_at).toLocaleDateString("en-GB")}.
              </p>
              {credit.project_ref && <p>Project {credit.project_ref}</p>}
              {credit.applied_pence === null && credit.qualifying > 0 && (
                <form onSubmit={(event) => void redeem(event, credit)}>
                  <p>
                    Record the credit applied to an agreed project. Update the
                    invoice separately.
                  </p>
                  <label>
                    Project reference{" "}
                    <input
                      name="reference"
                      minLength={3}
                      maxLength={120}
                      required
                    />
                  </label>
                  <label>
                    Qualifying fee in GBP{" "}
                    <input
                      name="fee"
                      type="number"
                      min="0.01"
                      max="1000000"
                      step="0.01"
                      required
                    />
                  </label>
                  <label>
                    When the project was commissioned{" "}
                    <input name="commissioned" type="datetime-local" required />
                  </label>
                  <button className="button secondary" disabled={busy}>
                    {busy ? "Recording…" : "Record project credit"}
                  </button>
                </form>
              )}
            </details>
          ))}
        </>
      )}
    </section>
  );
}
