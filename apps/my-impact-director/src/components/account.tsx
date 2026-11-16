"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { api } from "./session";
import { SaveReview } from "./save-review";
import { safeReturnPath } from "@/lib/return-path";
export function Account({
  next = "/reviews",
  initialMode = "login",
  setup = false,
  email = "",
  name = "",
}: {
  next?: string;
  initialMode?: "login" | "signup";
  setup?: boolean;
  email?: string;
  name?: string;
}) {
  const passwordHelp = useId();
  const [mode, setMode] = useState(initialMode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const Heading = setup ? "h2" : "h1";
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: mode,
          email: f.get("email"),
          password: f.get("password"),
          ...(mode === "signup" ? { name: f.get("name") } : {}),
        }),
      });
      window.location.assign(safeReturnPath(next));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn’t complete sign-in. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="account-card simple-account">
      <p className="eyebrow">My Reports</p>
      <Heading>
        {setup
          ? "Choose your password."
          : mode === "login"
            ? "Log in."
            : "Create your free account."}
      </Heading>
      <p>
        {setup
          ? "Keep your existing reports and use email and password next time."
          : "Your reports, progress and results. Ready when you are."}
      </p>
      <form onSubmit={submit} key={mode} method="post">
        {mode === "signup" && (
          <label>
            Your name
            <input
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={120}
              required
              defaultValue={name}
            />
          </label>
        )}
        <label>
          Email address
          <input
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
            defaultValue={email}
            readOnly={setup}
          />
        </label>
        <div className="account-password-field">
          <label>
            Password
            <input
              type="password"
              name="password"
              aria-describedby={passwordHelp}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              minLength={mode === "signup" ? 10 : 8}
              maxLength={200}
              required
            />
          </label>
          <small id={passwordHelp}>
            {mode === "signup"
              ? "At least 10 characters."
              : "Your My Social Impact account password."}
          </small>
        </div>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : setup
              ? "Set my password"
              : mode === "login"
                ? "Log in"
                : "Create my free account"}
        </button>
      </form>
      {mode === "login" && (
        <p>
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
      )}
      {!setup && (
        <p>
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button
            className="text-link"
            type="button"
            onClick={() => {
              setError("");
              setMode(mode === "login" ? "signup" : "login");
            }}
          >
            {mode === "login" ? "Create your free account." : "Log in."}
          </button>
        </p>
      )}
      {setup && (
        <p>
          Already have a My Social Impact password?{" "}
          <Link href="/login">Log in</Link> or{" "}
          <Link href="/forgot-password">reset it</Link>.
        </p>
      )}
      {!setup && (
        <details className="legacy-account-help">
          <summary>Previously used an email link?</summary>
          <p>
            Open a saved report email, then choose a password in Account. If
            your link has expired, recover access here first.
          </p>
          <SaveReview returning recovery />
        </details>
      )}
      <p className="fine-print">
        Your My Social Impact login works here too. By continuing, you agree to
        our <Link href="/terms">terms</Link> and{" "}
        <Link href="/privacy">privacy notice</Link>. No marketing subscription.
      </p>
    </div>
  );
}
