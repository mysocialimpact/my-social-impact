"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, api } from "./session";
import { SaveReview } from "./save-review";
import { authClient } from "@/lib/auth-client";
export function AccountSettings() {
  const { user, loading, error } = useSession(),
    [failure, setFailure] = useState(""),
    [notice, setNotice] = useState(""),
    [marketing, setMarketing] = useState(false),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [options, setOptions] = useState({ google: false, apple: false });
  useEffect(() => {
    if (user && !user.anonymous) {
      api("/api/account/preferences")
        .then((d) => {
          setMarketing(d.marketing_opt_in);
          setReady(true);
        })
        .catch((e) => setFailure(e.message));
      api("/api/account/options")
        .then(setOptions)
        .catch(() => {});
    }
  }, [user?.id, user?.anonymous]);
  if (loading) return <p role="status">Opening your account…</p>;
  if (!user || user.anonymous)
    return (
      <div className="simple-account">
        <h1>Your account.</h1>
        <p>All your reviews. One secure sign-in.</p>
        <Link className="button primary" href="/login?next=/account">
          Continue to your account →
        </Link>
      </div>
    );
  async function connect(provider?: "google" | "apple") {
    setBusy(true);
    setFailure("");
    try {
      if (provider && user?.socialAccount) {
        const result = await authClient.linkSocial({
          provider,
          callbackURL: "/auth/complete?next=/account",
        });
        if (result.error) throw new Error(result.error.message);
      } else {
        await api("/api/account/link-workspace", { method: "POST" });
        window.location.assign("/login?connect=1&next=/account");
      }
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <div className="account-settings">
      <p className="eyebrow">Your private workspace</p>
      <h1>
        Make yourself
        <br />
        <em>at home.</em>
      </h1>
      <p>
        Signed in as <strong>{user.email}</strong>
      </p>
      <p>
        {user.emailVerified
          ? "Email ownership confirmed. Your digital reports use this address."
          : "Confirm your email ownership once to receive detailed reports."}
      </p>
      <p>
        <Link href="/reviews">Open My Reports →</Link>
        {user.founder && (
          <>
            {" "}
            · <Link href="/founder">Founder Dashboard →</Link>
          </>
        )}
      </p>
      {!user.emailVerified && <SaveReview returning />}
      <section className="account-preferences">
        <p className="eyebrow">One account, more ways in</p>
        <h2>Sign in your way.</h2>
        <p>
          Connect another sign-in while you’re securely signed in here. We’ll
          keep this workspace and its reports together.
        </p>
        <div className="account-actions">
          <button
            className="button secondary"
            disabled={busy || !options.google}
            onClick={() => connect("google")}
          >
            Connect Google
          </button>
          <button
            className="button secondary"
            disabled={busy || !options.apple}
            onClick={() => connect("apple")}
          >
            Connect Apple
          </button>
          <button
            className="text-link"
            disabled={busy}
            onClick={() => connect()}
          >
            Connect this workspace to another verified account →
          </button>
        </div>
        <p className="fine-print">
          Using Apple’s Hide My Email? Connect Apple from this account first so
          your private relay address leads to the right workspace.
        </p>
        {user.passwordAccount && (
          <p className="fine-print">
            Your existing My Social Impact account remains available. This
            sign-in update doesn’t change its password.
          </p>
        )}
      </section>
      <section className="account-preferences">
        <p className="eyebrow">Entirely up to you</p>
        <h2>Stay in the loop?</h2>
        <label className="consent">
          <input
            type="checkbox"
            checked={marketing}
            disabled={!ready || busy}
            onChange={async (e) => {
              const value = e.target.checked;
              setBusy(true);
              try {
                await api("/api/account/preferences", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ marketing: value }),
                });
                setMarketing(value);
                setNotice("Your preference is saved.");
              } catch (e) {
                setFailure(
                  e instanceof Error ? e.message : "Please try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />{" "}
          Email me occasional My Impact Director news and services. I can
          unsubscribe at any time.
        </label>
        <p className="fine-print">
          Report delivery and sign-in messages work regardless of this
          preference.
        </p>
        {notice && <p role="status">{notice}</p>}
      </section>
      <p>
        <Link href="/reviews">Manage your reports and retention →</Link>
      </p>
      {(error || failure) && (
        <p className="alert error" role="alert">
          {failure || error}
        </p>
      )}
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/account", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "logout" }),
            });
            window.location.assign("/");
          } catch (e) {
            setFailure(
              e instanceof Error
                ? e.message
                : "Unable to log out. Please try again.",
            );
            setBusy(false);
          }
        }}
      >
        Log out
      </button>
    </div>
  );
}
