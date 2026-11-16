"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useSession } from "./session";
import { Arrow } from "./icons";
import { useReportAction } from "./action-bar";
type Mode = "signup" | "login" | "forgot";
export function Account({
  next = "/reviews",
  initialMode = "login",
  compact = false,
}: {
  next?: string;
  initialMode?: Mode;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(initialMode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [visible, setVisible] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      // Keep the authorised anonymous report cookie through account creation.
      const d = await api("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: mode === "forgot" ? "request-reset" : mode,
          email: f.get("email"),
          ...(mode !== "forgot" ? { password: f.get("password") } : {}),
          ...(mode === "signup"
            ? { marketing: f.get("marketing") === "on" }
            : {}),
        }),
      });
      if (mode === "forgot") {
        setSent(true);
        setBusy(false);
        return;
      }
      const destination =
        next.startsWith("/") && !next.startsWith("//") ? next : "/reviews";
      window.location.assign(
        d.verified
          ? destination
          : `/verify-email?next=${encodeURIComponent(destination)}${d.verificationSent ? "" : "&resend=1"}`,
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div
      className={"account-form " + (compact ? "account-form-compact" : "")}
      id="account-form"
    >
      <p className="eyebrow">
        {mode === "signup"
          ? "YOUR FREE ACCOUNT"
          : mode === "forgot"
            ? "ACCOUNT RECOVERY"
            : "WELCOME BACK"}
      </p>
      <h2>
        {mode === "signup"
          ? "Make it yours."
          : mode === "forgot"
            ? "Forgot your password?"
            : "Log in."}
      </h2>
      {mode === "signup" && (
        <p>
          Just your email and a password. Confirm your address once, then come
          back whenever you like.
        </p>
      )}
      {mode === "login" && (
        <p>
          Use your My Social Impact account details. Your reports will be
          waiting for you.
        </p>
      )}
      {mode === "forgot" && (
        <p>
          We’ll send a secure reset link if an account exists. The email opens
          our My Social Impact account service; after resetting your password,
          return here to log in.
        </p>
      )}
      {sent ? (
        <div className="account-confirmation" role="status">
          <h3>Check your inbox.</h3>
          <p>
            If this address has a password account, a reset link is on its way.
            Check your spam folder too.
          </p>
          <p>
            Previously used email links only?{" "}
            <Link href="/register">Create your password account</Link> using the
            same address. Confirm it to reconnect your saved reports.
          </p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          {mode !== "forgot" && (
            <label>
              Password
              <div className="password-field">
                <input
                  type={visible ? "text" : "password"}
                  name="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  required
                  minLength={mode === "signup" ? 10 : 1}
                  maxLength={200}
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? "Hide" : "Show"}
                </button>
              </div>
              {mode === "signup" && (
                <small>
                  At least 10 characters. A password manager can fill this for
                  you.
                </small>
              )}
            </label>
          )}
          {mode === "signup" && (
            <label className="consent-choice">
              <input type="checkbox" name="marketing" />
              <span>
                I'd like to receive occasional news, practical ideas and updates
                from My Social Impact.
                <small>
                  Optional. You can unsubscribe in Account at any time.
                </small>
              </span>
            </label>
          )}
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create my free account"
                : mode === "forgot"
                  ? "Send password reset"
                  : "Log in"}{" "}
            <Arrow />
          </button>
        </form>
      )}
      <div className="account-switch">
        {mode === "login" ? (
          <>
            <button
              onClick={() => {
                setMode("forgot");
                setError("");
                setSent(false);
              }}
            >
              Forgot password?
            </button>
            <span>
              New here?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
              >
                Create free account
              </button>
            </span>
          </>
        ) : (
          <button
            onClick={() => {
              setMode("login");
              setError("");
              setSent(false);
            }}
          >
            Already have an account? Log in
          </button>
        )}
      </div>
      {mode === "signup" && (
        <p className="account-legal">
          By creating an account, you agree to our{" "}
          <Link href="/terms">terms</Link> and{" "}
          <Link href="/privacy">privacy notice</Link>. Verification and report
          emails are part of the service; marketing is optional.
        </p>
      )}
    </div>
  );
}
export function AccountPage({
  mode = "login",
  next,
}: {
  mode?: Mode;
  next?: string;
}) {
  const { user, loading } = useSession(),
    setAction = useReportAction();
  useEffect(() => {
    setAction({
      id: "account",
      status: "complete",
      stage: 0,
      contextTitle: "Your own Impact Director. Free.",
      contextDetail:
        "Save your work. Get your full reports. Come back anytime.",
      primaryLabel:
        mode === "signup"
          ? "Create your free account"
          : mode === "forgot"
            ? "Recover your account"
            : "Log in to your workspace",
      primaryHref: "#account-form",
    });
    return () => setAction(null);
  }, [mode, setAction]);
  if (!loading && user && !user.anonymous && user.passwordAccount)
    return (
      <section className="section auth-introduction">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Welcome back.</h1>
        <p>You’re logged in as {user.email}.</p>
        <Link
          className="button primary"
          href={user.emailVerified ? "/reviews" : "/verify-email"}
        >
          {user.emailVerified ? "Open My Reports" : "Confirm your email"}
        </Link>
      </section>
    );
  return (
    <section className="section auth-layout">
      <div className="auth-introduction">
        <p className="eyebrow">YOUR IMPACT DIRECTOR. YOURS TO KEEP.</p>
        <h1>
          {mode === "signup" ? (
            <>
              Make My Impact Director <span>yours.</span>
            </>
          ) : mode === "forgot" ? (
            <>
              Let’s get you <span>back in.</span>
            </>
          ) : (
            <>
              Your reports.
              <br />
              Your progress.
              <br />
              <span>Your Impact Director.</span>
            </>
          )}
        </h1>
        <p className="auth-lead">
          Create your free account. Save your reports, download your assessments
          and pick up where you left off — whenever you like.
        </p>
        <ol className="account-benefits">
          <li>
            <b>01</b>
            <span>Save your documents and all three assessments.</span>
          </li>
          <li>
            <b>02</b>
            <span>Download and securely share your detailed reports.</span>
          </li>
          <li>
            <b>03</b>
            <span>Return to your workspace on any device.</span>
          </li>
          <li>
            <b>04</b>
            <span>Receive completed reports by email.</span>
          </li>
        </ol>
        <p className="account-free">
          The snapshot and the full reports are free.
        </p>
      </div>
      <Account initialMode={mode} next={next} />
    </section>
  );
}
