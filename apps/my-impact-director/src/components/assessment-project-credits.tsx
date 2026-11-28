"use client";

import { useEffect, useState } from "react";
import { frameworkNames, type Framework } from "@/lib/rubric";
import { api, useSession } from "./session";

type Credit = {
  id: string;
  framework: Framework;
  available_pence: number;
  applied_pence: number | null;
  ends_at: string;
  status: string;
};
const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});
const statusLabels: Record<string, string> = {
  expired: "Expired",
  suspended: "Payment balance under review",
  reconcile: "Please contact My Social Impact about this credit",
};

export function AssessmentProjectCredits() {
  const { user } = useSession();
  const owner = user?.emailVerified && !user.anonymous ? user.id : null;
  const [result, setResult] = useState<{
    owner: string;
    credits?: Credit[];
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    api("/api/assessment-checkout/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      signal: controller.signal,
    })
      .then(({ credits }) => {
        if (!controller.signal.aborted) setResult({ owner, credits });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({ owner, error: error.message });
      });
    return () => controller.abort();
  }, [owner]);
  if (!owner || result?.owner !== owner) return null;
  return (
    <section
      className="section"
      aria-labelledby="assessment-project-credit-title"
    >
      <h2 id="assessment-project-credit-title">Future-project credit</h2>
      <p>
        Your Human Intelligence fee can be credited towards qualifying work with
        My Social Impact.
      </p>
      <p>Stripe Sandbox account view.</p>
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : result.credits?.length ? (
        <ul>
          {result.credits.map((credit) => (
            <li key={credit.id}>
              <strong>{frameworkNames[credit.framework]}</strong>
              {" · "}
              {credit.status === "available"
                ? `${money.format(credit.available_pence / 100)} available. Commission by ${new Date(credit.ends_at).toLocaleDateString("en-GB")}.`
                : credit.status === "redeemed"
                  ? `${money.format((credit.applied_pence ?? 0) / 100)} applied to your project.`
                  : statusLabels[credit.status]}
            </li>
          ))}
        </ul>
      ) : (
        <p>No project credits available yet.</p>
      )}
    </section>
  );
}
