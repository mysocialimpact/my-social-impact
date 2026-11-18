"use client";
import { useEffect, useState } from "react";

export function SharePublication({ id }: { id: string }) {
  const [path, setPath] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const endpoint = "/api/reviews/" + id + "/sharing";
  useEffect(() => {
    let alive = true;
    setReady(false);
    setPath(null);
    setMessage("");
    fetch(endpoint, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const d = await r.json();
        if (alive) {
          setPath(d.path);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive)
          setMessage(
            "Sharing status could not be loaded. Reload to try again.",
          );
      });
    return () => {
      alive = false;
    };
  }, [endpoint]);
  async function change(method: "POST" | "DELETE") {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(endpoint, { method });
      if (!r.ok) throw Error();
      const d = await r.json();
      setPath(d.path);
      setMessage(
        d.path
          ? "Your read-only link is ready."
          : "Sharing stopped. The previous link has expired.",
      );
    } catch {
      setMessage(
        "The change could not be confirmed. Reload to check the current status.",
      );
      setReady(false);
    } finally {
      setBusy(false);
    }
  }
  const url = path ? new URL(path, window.location.origin).href : "";
  return (
    <section className="publication-access" id="share-report">
      <div>
        <p className="eyebrow">Report access</p>
        <h2>
          {!ready
            ? "Share this report"
            : path
              ? "Link sharing is on."
              : "Private to you."}
        </h2>
        <p>
          Your report is saved in My Reports. Anyone you give a sharing link to
          can read this assessment, including its findings and quoted passages.
          You can revoke the link here.
        </p>
      </div>
      <div>
        {path ? (
          <>
            <label>
              Read-only sharing link
              <input readOnly value={url} onFocus={(e) => e.target.select()} />
            </label>
            <button
              className="button primary"
              disabled={!ready || busy}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setMessage("Link copied.");
                } catch {
                  setMessage("Select and copy the link above.");
                }
              }}
            >
              Copy link
            </button>
            <button
              className="subtle-button"
              disabled={!ready || busy}
              onClick={() => change("DELETE")}
            >
              Revoke link
            </button>
          </>
        ) : (
          <button
            className="button primary"
            disabled={!ready || busy}
            onClick={() => change("POST")}
          >
            Create sharing link
          </button>
        )}
        <p role="status">{message}</p>
      </div>
    </section>
  );
}
