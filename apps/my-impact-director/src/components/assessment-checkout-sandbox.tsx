"use client";

import { useEffect, useRef, useState } from "react";
import type { StripeEmbeddedCheckout } from "@stripe/stripe-js";
import {
  assessmentTierNames,
  assessmentTiers,
  type AssessmentTier,
} from "@/lib/assessment-pricing";
import { api, useSession } from "./session";

type Quote = {
  tier: AssessmentTier;
  list: number;
  credit: number;
  discount: number;
  packageTotal: number;
  due: number;
};
type Session = {
  id: string;
  clientSecret: string | null;
  publishableKey: string;
  state: string;
};
const moneyFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});
const money = (pence: number) => moneyFormat.format(pence / 100);
const endpoint = "/api/assessment-checkout";
function post(path: string, payload: object) {
  return api(endpoint + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function EmbeddedAssessmentCheckout({
  session,
  onComplete,
}: {
  session: Session;
  onComplete: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Opening Stripe Sandbox…");
  useEffect(() => {
    if (!session.clientSecret) return;
    let active = true;
    let checkout: StripeEmbeddedCheckout | undefined;
    void (async () => {
      try {
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(session.publishableKey);
        if (!stripe || !session.clientSecret || !active || !mount.current)
          return;
        checkout = await stripe.initEmbeddedCheckout({
          clientSecret: session.clientSecret,
          onComplete,
        });
        if (!active || !mount.current) {
          checkout.destroy();
          return;
        }
        checkout.mount(mount.current);
        setStatus("");
      } catch {
        if (active)
          setStatus(
            "Stripe could not open. Close checkout and try opening it again.",
          );
      }
    })();
    return () => {
      active = false;
      checkout?.destroy();
    };
  }, [session, onComplete]);
  return (
    <>
      {status && <p role="status">{status}</p>}
      <div ref={mount} />
    </>
  );
}

export function AssessmentCheckoutSandbox({ review }: { review: string }) {
  const { user } = useSession();
  return user?.emailVerified && !user.anonymous ? (
    <AssessmentCheckout key={user.id} review={review} />
  ) : null;
}

function AssessmentCheckout({ review }: { review: string }) {
  const [tier, setTier] = useState<AssessmentTier>("advanced");
  const [promotion, setPromotion] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [completion, setCompletion] = useState(false);
  useEffect(() => {
    if (!completion || !orderId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll(attempt: number) {
      try {
        const data = await post("/status", { id: orderId });
        if (!active) return;
        if (data.state === "paid") {
          setNotice("Stripe confirmed your Sandbox payment.");
          setSession(null);
          setQuote(null);
          setOrderId("");
          setCompletion(false);
        } else if (data.state === "expired") {
          setNotice(
            "This checkout expired. Request a fresh price to try again.",
          );
          setSession(null);
          setQuote(null);
          setOrderId("");
          setCompletion(false);
        } else if (attempt < 4) {
          setNotice("Waiting for Stripe to confirm the payment…");
          timer = setTimeout(() => void poll(attempt + 1), 2000);
        } else {
          setNotice(
            "Stripe has not confirmed payment yet. Check again in a moment.",
          );
          setCompletion(false);
        }
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error
              ? e.message
              : "Payment status is temporarily unavailable.",
          );
          setCompletion(false);
        }
      }
    }
    void poll(0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [completion, orderId]);

  const requestCompletion = useRef(() => setCompletion(true)).current;

  async function request(action: "quote" | "checkout") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await post("", {
        action,
        review,
        tier,
        ...(tier === "human" && promotion.trim()
          ? { promotion: promotion.trim() }
          : {}),
        ...(action === "checkout" && quote ? { due: quote.due } : {}),
      });
      if (result.internal) {
        setQuote(null);
        setNotice("Founder access is exempt from payment.");
      } else if (action === "quote") {
        setQuote(result.quote);
        if (result.pending) {
          setTier(result.quote.tier);
          setPromotion(result.pending.promotion ?? "");
          setOrderId(result.pending.id);
          setNotice("An existing checkout is ready to resume.");
        }
      } else {
        setOrderId(result.id);
        if (result.clientSecret) setSession(result);
        else {
          setNotice("Checking the saved payment status…");
          setCompletion(true);
        }
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not open this assessment checkout.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section" aria-labelledby="assessment-sandbox-title">
      <h2 id="assessment-sandbox-title">
        Assessment checkout · Stripe Sandbox
      </h2>
      <p>
        For testing. Use Stripe test cards only. Payments here do not start an
        assessment or book a meeting.
      </p>
      <div role="status">{notice}</div>
      {error && <p role="alert">{error}</p>}
      {session ? (
        <>
          <EmbeddedAssessmentCheckout
            session={session}
            onComplete={requestCompletion}
          />
          <button
            className="button secondary small"
            type="button"
            onClick={() => setSession(null)}
          >
            Close payment form
          </button>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void request("quote");
          }}
        >
          <label>
            Assessment level
            <select
              value={tier}
              onChange={(event) => {
                setTier(event.target.value as AssessmentTier);
                setQuote(null);
              }}
            >
              {assessmentTiers.map((choice) => (
                <option value={choice} key={choice}>
                  {assessmentTierNames[choice]}
                </option>
              ))}
            </select>
          </label>
          {tier === "human" && (
            <label>
              Promotion code
              <input
                value={promotion}
                maxLength={32}
                onChange={(event) => {
                  setPromotion(event.target.value);
                  setQuote(null);
                }}
              />
            </label>
          )}
          <button className="button secondary" disabled={busy}>
            {busy ? "Checking price…" : "Calculate my price"}
          </button>
        </form>
      )}
      {quote && (
        <div className="notice">
          <h3>{assessmentTierNames[quote.tier]}</h3>
          <dl>
            <dt>Standard price</dt>
            <dd>{money(quote.list)}</dd>
            <dt>Promotion</dt>
            <dd>−{money(quote.discount)}</dd>
            <dt>Previous payments credited</dt>
            <dd>−{money(quote.credit)}</dd>
            <dt>Due today</dt>
            <dd>
              <strong>{money(quote.due)}</strong>
            </dd>
          </dl>
          <p>
            Total across this assessment’s eligible payments{" "}
            {money(quote.packageTotal)}.
          </p>
          {!session && (
            <button
              className="button primary"
              type="button"
              disabled={busy || completion}
              onClick={() => void request("checkout")}
            >
              {busy
                ? "Opening checkout…"
                : `Review the ${money(quote.due)} test payment`}
            </button>
          )}
        </div>
      )}
      {orderId && (
        <button
          className="button secondary small"
          type="button"
          disabled={completion}
          onClick={() => setCompletion(true)}
        >
          Check payment status
        </button>
      )}
    </section>
  );
}
