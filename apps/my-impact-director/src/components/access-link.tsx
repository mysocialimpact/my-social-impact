"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "./session";
export function AccessLink() {
  const captured = useRef(false);
  const [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    setToken(window.location.hash.slice(1));
    window.history.replaceState(null, "", "/access");
  }, []);
  return (
    <div className="account-card">
      <h2>Confirm your email.</h2>
      <p>
        Confirm this address to receive your detailed review when it is ready,
        and open your personal workspace. Once you have a password account, you
        can log in normally on your next visit.
      </p>
      <button
        className="button primary"
        disabled={!token || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const d = await api("/api/save", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "redeem", token }),
            });
            window.location.replace(d.destination);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Please try again.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening your review…" : "Confirm email & open review"}
      </button>
      {!token && (
        <p className="fine-print">
          Use the complete private link in your email. If you refreshed this
          page, open the email link again.
        </p>
      )}
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      <p>
        <Link href="/verify-email">Resend confirmation</Link> ·{" "}
        <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
