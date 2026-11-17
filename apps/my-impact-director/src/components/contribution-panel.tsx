"use client";
import { useEffect, useRef, useState } from "react";
import type { StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { api } from "./session";
import { contributionPence } from "@/lib/contribution-amounts";
type Configuration = {
  available: boolean;
  supported?: boolean;
  report?: string;
  scope?: string;
  maximum?: number;
  merchant?: string;
  legalName?: string;
};
type Checkout = {
  id: string;
  status: string;
  amount: number;
  clientSecret?: string | null;
  publishableKey?: string;
  merchant?: string;
};
const money = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    pence / 100,
  );
function storage(key: string, value?: string) {
  try {
    if (value !== undefined) sessionStorage.setItem(key, value);
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
export function ContributionPanel({ reviewId }: { reviewId: string }) {
  const [config, setConfig] = useState<Configuration | null>(null),
    [expanded, setExpanded] = useState(false),
    [choice, setChoice] = useState("10"),
    [custom, setCustom] = useState(""),
    [checkout, setCheckout] = useState<Checkout | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [paid, setPaid] = useState(false),
    [checking, setChecking] = useState(false);
  const mount = useRef<HTMLDivElement>(null),
    attempt = useRef<string>(""),
    checkoutRef = useRef<StripeEmbeddedCheckout | null>(null),
    checkingRef = useRef(false);
  const key =
    config?.report && config.scope
      ? `mid-support-v1:${config.scope}:${config.report}`
      : "";
  useEffect(() => {
    let live = true;
    setConfig(null);
    setCheckout(null);
    setError("");
    setPaid(false);
    attempt.current = "";
    api(`/api/contributions?review=${reviewId}`)
      .then((d: Configuration) => {
        if (!live) return;
        setConfig(d);
        if (!d.available) return;
        const seen = `mid-support-v1:${d.scope}:${d.report}:seen`;
        setExpanded(!d.supported && !storage(seen));
        storage(seen, "1");
      })
      .catch(() => {
        if (live) setConfig({ available: false });
      });
    return () => {
      live = false;
    };
  }, [reviewId]);
  useEffect(() => {
    if (!checkout?.clientSecret || !checkout.publishableKey || paid) return;
    let cancelled = false;
    let embedded: StripeEmbeddedCheckout | undefined;
    async function verify() {
      if (cancelled || checkingRef.current) return;
      checkingRef.current = true;
      setChecking(true);
      try {
        for (let i = 0; i < 5 && !cancelled; i++) {
          const result = await api("/api/contributions/status", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: checkout!.id }),
          });
          if (["succeeded", "partially_refunded"].includes(result.status)) {
            if (!cancelled) {
              setPaid(true);
              setError("");
              storage(key + ":seen", "1");
            }
            return;
          }
          if (result.status === "refunded") {
            if (!cancelled)
              setError(
                "This contribution has been refunded. Thank you for considering supporting our work.",
              );
            return;
          }
          if (i < 4) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (!cancelled)
          setError(
            "Stripe hasn’t confirmed the payment yet. Check its status before making another contribution.",
          );
      } catch {
        if (!cancelled)
          setError(
            "We couldn’t confirm the payment yet. Please check its status before trying again.",
          );
      } finally {
        checkingRef.current = false;
        if (!cancelled) setChecking(false);
      }
    }
    void (async () => {
      try {
        const { loadStripe } = await import("@stripe/stripe-js/pure");
        const stripe = await loadStripe(checkout.publishableKey!);
        if (cancelled) return;
        if (!stripe)
          throw Error(
            "Secure payment couldn’t be opened. Your reviews remain free.",
          );
        embedded = await stripe.initEmbeddedCheckout({
          clientSecret: checkout.clientSecret!,
          onComplete: () => {
            void verify();
          },
        });
        if (cancelled || !mount.current) {
          embedded.destroy();
          return;
        }
        checkoutRef.current = embedded;
        embedded.mount(mount.current);
      } catch {
        if (!cancelled)
          setError(
            "We couldn’t open secure payment. You can check its status or close it below. Your review is unaffected.",
          );
      }
    })();
    return () => {
      cancelled = true;
      embedded?.destroy();
      checkoutRef.current = null;
    };
  }, [checkout, key, paid]);
  if (!config?.available) return null;
  async function check() {
    if (!checkout || busy || checking) return;
    setChecking(true);
    setError("");
    try {
      const r = await api("/api/contributions/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: checkout.id }),
      });
      if (["succeeded", "partially_refunded"].includes(r.status)) setPaid(true);
      else if (r.status === "cancelled") {
        setCheckout(null);
        attempt.current = "";
        storage(key + ":attempt", "");
        setError(
          "This payment screen has closed. You can choose an amount and start again.",
        );
      } else
        setError(
          r.status === "refunded"
            ? "This contribution has been refunded."
            : "Payment is not confirmed yet. Please check again before starting another contribution.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please check again shortly.");
    } finally {
      setChecking(false);
    }
  }
  if (paid || config.supported)
    return (
      <section
        className="contribution-thanks"
        aria-label="Thank you for your support"
      >
        <p className="eyebrow">THANK YOU FOR SUPPORTING MY IMPACT DIRECTOR.</p>
        <p>
          Your contribution helps us keep developing these tools and making
          impact expertise accessible to more organisations. We really
          appreciate it.
        </p>
        <a href="#review-results">Return to your assessment ↑</a>
        <span> · </span>
        <a href="/reviews">My Reports</a>
      </section>
    );
  if (!expanded)
    return (
      <div className="contribution-discreet">
        <button type="button" onClick={() => setExpanded(true)}>
          Help us keep good ideas free — support our work ↗
        </button>
      </div>
    );
  return (
    <section className="contribution-panel" aria-labelledby="support-heading">
      <div className="contribution-message">
        <p className="eyebrow">A GOOD IDEA. OPEN TO EVERYONE.</p>
        <h2 id="support-heading">
          HELP US KEEP
          <br />
          GOOD IDEAS <span>FREE.</span>
        </h2>
        <p>
          We’re building three free impact report reviews to help charities,
          social enterprises and organisations of all sizes understand and
          improve their impact.
        </p>
        <p>
          <strong>
            Your support helps us develop these tools, power the AI behind every
            review and keep improving the service.
          </strong>
        </p>
        <p>
          If you’ve found your review useful, we’d love you to contribute
          whatever feels right.
        </p>
      </div>
      <div className="contribution-choice">
        {!checkout ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError("");
              try {
                contributionPence(
                  choice === "other" ? custom : choice,
                  config.maximum || 100000,
                );
                attempt.current ||=
                  storage(key + ":attempt") || crypto.randomUUID();
                storage(key + ":attempt", attempt.current);
                const result: Checkout = await api("/api/contributions", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    review: reviewId,
                    amount: choice === "other" ? custom : choice,
                    attempt: attempt.current,
                  }),
                });
                setCheckout(result);
                if (["succeeded", "partially_refunded"].includes(result.status))
                  setPaid(true);
                else if (!result.clientSecret)
                  setError(
                    "This payment is awaiting confirmation or has closed. Please check its status below.",
                  );
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Secure payment is unavailable. Please try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset disabled={busy}>
              <legend>Choose your one-off contribution</legend>
              <div className="contribution-amounts">
                {["5", "10", "20", "other"].map((value) => (
                  <label
                    key={value}
                    className={choice === value ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name="contribution"
                      value={value}
                      checked={choice === value}
                      onChange={() => {
                        setChoice(value);
                        setError("");
                        attempt.current = "";
                        storage(key + ":attempt", "");
                      }}
                    />
                    {value === "other" ? "Other" : `£${value}`}
                  </label>
                ))}
              </div>
              {choice === "other" && (
                <label className="contribution-custom">
                  Amount in pounds (£)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value);
                      attempt.current = "";
                      storage(key + ":attempt", "");
                    }}
                    required
                    maxLength={9}
                    placeholder="e.g. 15.50"
                  />
                  <small>
                    £1–{money(config.maximum || 100000)}. One-off, with no
                    subscription.
                  </small>
                </label>
              )}
            </fieldset>
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? "Opening secure payment…" : "Support our work →"}
            </button>
          </form>
        ) : (
          <div className="contribution-payment">
            <h3>{money(checkout.amount)} · one-off support</h3>
            <p>Payment to {checkout.merchant || config.legalName}.</p>
            <div ref={mount} aria-label="Secure inline Stripe payment" />
            {checking && <p role="status">Checking your payment securely…</p>}
            <div className="contribution-payment-actions">
              <button
                type="button"
                disabled={checking || busy}
                onClick={() => void check()}
              >
                Check payment status
              </button>
              <button
                type="button"
                disabled={checking || busy}
                onClick={async () => {
                  if (busy) return;
                  setBusy(true);
                  setError("");
                  try {
                    const r = await api("/api/contributions/status", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ id: checkout.id, cancel: true }),
                    });
                    if (["succeeded", "partially_refunded"].includes(r.status))
                      setPaid(true);
                    else {
                      setCheckout(null);
                      attempt.current = "";
                      storage(key + ":attempt", "");
                    }
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Please check payment status before starting again.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Close payment
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="contribution-error" role="alert">
            {error}
          </p>
        )}
        <p className="contribution-reassurance">
          <strong>Entirely optional.</strong> Your reviews remain free whether
          you contribute or not.
        </p>
        {!checkout && (
          <p className="fine-print">
            One-off voluntary support in GBP. Secure payment to{" "}
            {config.legalName}, handled by Stripe. No marketing subscription.
          </p>
        )}
      </div>
    </section>
  );
}
