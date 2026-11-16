"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, useSession } from "./session";
import { useReportAction } from "./action-bar";
export function VerifyEmail({ notSent = false }: { notSent?: boolean }) {
  const { user, loading } = useSession(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    setAction = useReportAction();
  useEffect(() => {
    setAction({
      id: "account",
      status: "complete",
      stage: 0,
      contextTitle: "One last step.",
      contextDetail:
        "Confirm your address once. Then use your email and password.",
      primaryLabel: user?.emailVerified
        ? "Open your reports"
        : "Confirm your email to save your reports",
      primaryHref: user?.emailVerified ? "/reviews" : "#verify-email",
    });
    return () => setAction(null);
  }, [user?.emailVerified, setAction]);
  if (loading) return <p role="status">Opening your account…</p>;
  return (
    <div className="verification-layout" id="verify-email">
      <p className="eyebrow">YOUR FREE ACCOUNT</p>
      <h1>
        {user?.emailVerified
          ? "Your email is confirmed."
          : "Check your inbox to confirm your email address."}
      </h1>
      <p className="auth-lead">
        {user?.emailVerified ? (
          "Your workspace is ready. We’ll email your completed assessments, and you can log in with your password whenever you like."
        ) : user && !user.anonymous ? (
          <>
            {notSent
              ? "Your account was created, but the confirmation email could not be sent. Request a fresh link for "
              : "We’ve sent a confirmation link to "}
            <strong>{user.email}</strong>. Open it once to save your reports and
            receive your full assessments. Your review keeps running while you
            check your inbox.
          </>
        ) : (
          "Log in or create an account, then confirm your address once."
        )}
      </p>
      {user && !user.anonymous && !user.emailVerified && (
        <>
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("/api/save", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ email: user.email, account: true }),
                });
                setMessage(
                  "A fresh confirmation email is on its way. Check your inbox and spam folder.",
                );
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Sending…" : "Resend confirmation email"}
          </button>
          <p className="fine-print">
            The link expires after 30 minutes. You won’t need to verify again at
            every login.
          </p>
        </>
      )}
      {message && (
        <p role="status" className="alert">
          {message}
        </p>
      )}
      <p>
        <Link
          className="text-link"
          href={
            user?.emailVerified
              ? "/reviews"
              : user && !user.anonymous
                ? "/reviews"
                : "/login"
          }
        >
          {user?.emailVerified
            ? "Open My Reports →"
            : user && !user.anonymous
              ? "Continue your review →"
              : "Log in →"}
        </Link>
      </p>
    </div>
  );
}
