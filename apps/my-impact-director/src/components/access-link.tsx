"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./session";
export function AccessLink() {
  const [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setToken(window.location.hash.slice(1));
    window.history.replaceState(null, "", "/access");
  }, []);
  return (
    <div className="account-card">
      <h2>Welcome back.</h2>
      <p>
        Open your private review. This one-time link confirms access to your
        saved report.
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
        {busy ? "Opening your review…" : "Open my saved review"}
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
        <Link href="/reviews">Request a new sign-in link</Link>
      </p>
    </div>
  );
}
