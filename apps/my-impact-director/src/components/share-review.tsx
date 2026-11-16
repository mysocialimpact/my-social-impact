"use client";
import { useState } from "react";
import { api } from "./session";
type Share = { id: string; expires_at: string; revoked_at: string | null };
export function ShareReview({ id }: { id: string }) {
  const [open, setOpen] = useState(false),
    [shares, setShares] = useState<Share[]>([]),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      setShares((await api(`/api/reviews/${id}/shares`)).shares);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="share-control">
      <button
        className="text-link"
        onClick={() => {
          setOpen(!open);
          if (!open) void refresh();
        }}
      >
        Share assessment →
      </button>
      {open && (
        <section className="share-panel" aria-label="Sharing controls">
          <h3>Share your findings.</h3>
          <p>
            Anyone with your link can read this detailed assessment, including
            its quoted evidence. Your original PDF stays private. Share only
            material you have permission to disclose. Links expire after 30
            days; you can revoke them here.
          </p>
          <button
            className="button secondary small"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const d = await api(`/api/reviews/${id}/shares`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: "{}",
                });
                setUrl(d.url);
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Generate a share link
          </button>
          {url && (
            <label>
              Your private share link
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
              />
              <small>Select and copy this link. It is shown only now.</small>
            </label>
          )}
          {shares
            .filter((s) => !s.revoked_at && new Date(s.expires_at) > new Date())
            .map((s) => (
              <p key={s.id}>
                Active until{" "}
                {new Date(s.expires_at).toLocaleDateString("en-GB")}{" "}
                <button
                  className="subtle-button"
                  onClick={async () => {
                    try {
                      await api(`/api/reviews/${id}/shares`, {
                        method: "DELETE",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ id: s.id }),
                      });
                      setUrl("");
                      await refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Revoke link
                </button>
              </p>
            ))}
          {error && <p role="alert">{error}</p>}
        </section>
      )}
    </div>
  );
}
