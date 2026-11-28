"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { api } from "./session";
import { authClient } from "@/lib/auth-client";
import { safeReturnPath } from "@/lib/return-path";
export function Account({
  next = "/reviews",
  email = "",
  embedded = false,
  onAuthenticated,
}: {
  next?: string;
  initialMode?: "login" | "signup";
  setup?: boolean;
  email?: string;
  name?: string;
  embedded?: boolean;
  onAuthenticated?: () => void;
}) {
  const [options, setOptions] = useState<{
    google: boolean;
    apple: boolean;
    email: boolean;
  } | null>(null);
  const [address, setAddress] = useState(email),
    [showEmail, setShowEmail] = useState(false),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const emailId = useId();
  useEffect(() => {
    api("/api/account/options")
      .then(setOptions)
      .catch(() =>
        setError(
          "We couldn’t load sign-in options. Please refresh and try again.",
        ),
      );
  }, []);
  const destination = safeReturnPath(next);
  async function social(provider: "google" | "apple") {
    setBusy(provider);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: `/auth/complete?next=${encodeURIComponent(destination)}`,
        errorCallbackURL: "/login?auth_error=1",
      });
      if (result.error)
        throw new Error(
          result.error.message || "Sign-in could not be completed.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy("");
    }
  }
  async function emailSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("email");
    setError("");
    try {
      await api("/api/visitor", { method: "POST" });
      const result = await api("/api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: address,
          account: true,
          next: destination,
        }),
      });
      if (result.verified) {
        window.dispatchEvent(new Event("mid-session-refresh"));
        if (onAuthenticated) onAuthenticated();
        else window.location.assign(destination);
      } else setSent(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn’t send your link. Please try again.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <div
      className={`account-card unified-account ${embedded ? "is-embedded" : ""}`}
    >
      <p className="eyebrow">Your private workspace</p>
      <h2>{sent ? "Check your inbox." : "Your impact. One simple sign-in."}</h2>
      <p>
        {sent ? (
          <>
            We’ve sent a secure sign-in link to <strong>{address}</strong>. Open
            it to continue. It works once and expires in 30 minutes.
          </>
        ) : (
          "New here or coming back? Sign in below. We’ll create your free account if you need one, or take you straight back to your reports."
        )}
      </p>
      {!sent && (
        <>
          <div className="social-signin-options">
            <button
              type="button"
              className="button social-signin"
              disabled={!options?.google || !!busy}
              onClick={() => social("google")}
            >
              <span className="provider-mark" aria-hidden="true">
                G
              </span>
              {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </button>
            <button
              type="button"
              className="button social-signin"
              disabled={!options?.apple || !!busy}
              onClick={() => social("apple")}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path
                  fill="currentColor"
                  d="M17 12c0-2 1.5-3.2 1.6-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8C6.6 7 4 9 4 12.8c0 2.3.8 4.7 1.9 6.3.9 1.3 1.8 2.7 3.2 2.6 1.2-.1 1.7-.8 3.2-.8s1.9.8 3.2.8c1.4 0 2.3-1.3 3.1-2.6.9-1.5 1.3-2.9 1.3-3-.1 0-2.9-1.1-2.9-4.1ZM14.7 5.5c.7-.9 1.2-2.1 1.1-3.4-1.1.1-2.5.7-3.3 1.6-.7.8-1.3 2-1.1 3.2 1.2.1 2.5-.6 3.3-1.4Z"
                />
              </svg>
              {busy === "apple" ? "Opening Apple…" : "Continue with Apple"}
            </button>
            <button
              type="button"
              className="button social-signin"
              disabled={!options?.email || !!busy}
              onClick={() => setShowEmail(true)}
            >
              <span className="provider-mark" aria-hidden="true">
                @
              </span>
              Continue with email
            </button>
          </div>
          {options && (!options.google || !options.apple) && (
            <p className="fine-print">
              {options.email
                ? "Email sign-in is available. Social sign-in is being connected."
                : "Sign-in is temporarily unavailable. Please try again shortly."}
            </p>
          )}
          {showEmail && (
            <form onSubmit={emailSignIn}>
              <label htmlFor={emailId}>Email address</label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <button className="button primary" disabled={!!busy}>
                {busy === "email"
                  ? "Sending your link…"
                  : "Email my sign-in link →"}
              </button>
              <p className="fine-print">
                No password to remember. No marketing subscription.
              </p>
            </form>
          )}
        </>
      )}
      {sent && (
        <>
          <p className="fine-print">
            Can’t see it? Check spam and junk. Keep this page open if you want
            to change the address.
          </p>
          <button
            className="text-link"
            onClick={() => {
              setSent(false);
              setShowEmail(true);
            }}
          >
            Use a different address or request another link
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      <p className="fine-print">
        Your account and reviews are free. By continuing, you agree to our{" "}
        <Link href="/terms">terms</Link> and{" "}
        <Link href="/privacy">privacy notice</Link>. Marketing is optional and
        separate.
      </p>
    </div>
  );
}
