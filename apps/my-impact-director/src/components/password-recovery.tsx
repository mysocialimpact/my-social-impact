"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "./session";
export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState(""),
    [available, setAvailable] = useState<boolean | null>(null);
  const captured = useRef(false);
  useEffect(() => {
    if (reset) {
      if (captured.current) return;
      captured.current = true;
      const hash = location.hash.slice(1);
      setToken(
        new URLSearchParams(hash).get("token") ||
          new URLSearchParams(location.search).get("token") ||
          hash,
      );
      history.replaceState(null, "", "/reset-password");
    } else {
      api("/api/account?feature=password-reset")
        .then((d) => setAvailable(d.available))
        .catch(() => setAvailable(false));
    }
  }, [reset]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (reset && f.get("password") !== f.get("confirm"))
        throw Error("The passwords don’t match. Please check them.");
      await api("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          reset
            ? { action: "reset-password", token, password: f.get("password") }
            : { action: "request-reset", email: f.get("email") },
        ),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-card simple-account">
      <p className="eyebrow">My Reports</p>
      <h1>{reset ? "Choose a new password." : "Reset your password."}</h1>
      {done ? (
        <div role="status">
          <h2>{reset ? "Password updated." : "Check your inbox."}</h2>
          <p>
            {reset
              ? "You can now log in with your new password."
              : "If there’s an account for that address, the shared My Social Impact account service will email secure reset instructions. Follow the link, then return here to log in."}
          </p>
          <Link className="button primary" href="/login">
            Back to log in
          </Link>
        </div>
      ) : reset || available ? (
        <>
          <p>
            {reset
              ? "Use at least 10 characters."
              : "This resets the password you use across My Social Impact services."}
          </p>
          <form onSubmit={submit} method="post">
            {reset ? (
              <>
                <label>
                  New password
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={200}
                    required
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    type="password"
                    name="confirm"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={200}
                    required
                  />
                </label>
              </>
            ) : (
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
            )}
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary"
              disabled={busy || (reset && !token)}
            >
              {busy
                ? "Please wait…"
                : reset
                  ? "Update password"
                  : "Send reset instructions"}
            </button>
          </form>
        </>
      ) : available === null ? (
        <p role="status">Checking secure recovery…</p>
      ) : (
        <p>
          Secure recovery is temporarily unavailable.{" "}
          <a href="mailto:marcus@mysocialimpact.org">Email Marcus for help</a>.
        </p>
      )}
      <p>
        <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
