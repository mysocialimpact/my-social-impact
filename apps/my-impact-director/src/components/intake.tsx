"use client";
import { useState } from "react";
import { Account } from "./account";
import { useSession, api } from "./session";
import { DocumentIcon, Arrow } from "./icons";
import type { Candidate } from "@/lib/discovery";
export function Intake({ enabled }: { enabled: boolean }) {
  const { user, loading, error: sessionError } = useSession();
  const [tab, setTab] = useState("upload"),
    [file, setFile] = useState<File | null>(null),
    [consent, setConsent] = useState(false),
    [quality, setQuality] = useState(false),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [candidates, setCandidates] = useState<Candidate[] | null>(null),
    [selection, setSelection] = useState<Candidate | null>(null),
    [drag, setDrag] = useState(false);
  if (loading)
    return (
      <p className="loading" role="status">
        Checking your account…
      </p>
    );
  if (sessionError)
    return (
      <div className="alert error" role="alert">
        {sessionError}
      </div>
    );
  if (!user) return <Account />;
  function choose(f: File | undefined) {
    setError("");
    setSelection(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf") || f.size > 4_000_000) {
      setError("Please choose a PDF up to 4 MB.");
      return;
    }
    setFile(f);
  }
  async function upload() {
    if (!file || !consent) return;
    setBusy(true);
    setError("");
    const data = new FormData();
    data.set("file", file);
    data.set("consent", String(consent));
    data.set("qualityConsent", String(quality));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/reviews");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) throw new Error(d.error);
        window.location.assign("/reviews/" + d.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Please try again.");
        setBusy(false);
      }
    };
    xhr.onerror = () => {
      setError(
        "The connection was interrupted. Your upload may not have finished. Please retry.",
      );
      setBusy(false);
    };
    xhr.send(data);
  }
  async function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setCandidates(null);
    setSelection(null);
    try {
      const d = await api("/api/discovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "search",
          organisation: new FormData(e.currentTarget).get("organisation"),
        }),
      });
      setCandidates(d.candidates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!selection || !consent) return;
    setBusy(true);
    setError("");
    try {
      const d = await api("/api/discovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          url: selection.url,
          token: selection.token,
          expires: selection.expires,
          consent,
          qualityConsent: quality,
        }),
      });
      window.location.assign("/reviews/" + d.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <div className="intake">
      <div className="journey">
        <span className="done">✓ Account</span>
        <span className="current">2 · Your report</span>
        <span>3 · Your review</span>
      </div>
      {!enabled && (
        <div className="alert" role="status">
          <strong>We’re completing live validation.</strong> Reviews are not
          open yet. Please come back soon or{" "}
          <a href="https://mysocialimpact.org/#contact">
            contact My Social Impact
          </a>{" "}
          for a professional review.
        </div>
      )}
      <div className="segmented">
        <button
          aria-pressed={tab === "upload"}
          onClick={() => setTab("upload")}
        >
          Upload your report
        </button>
        <button aria-pressed={tab === "find"} onClick={() => setTab("find")}>
          Find a published report
        </button>
      </div>
      {tab === "upload" ? (
        <>
          <label
            className={"dropzone " + (drag ? "dragging" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              choose(e.dataTransfer.files[0]);
            }}
          >
            <DocumentIcon />
            <strong>{file ? file.name : "Drop your impact report here"}</strong>
            <span>
              {file
                ? `${(file.size / 1000000).toFixed(2)} MB · Ready for your confirmation`
                : "or choose a file from your device"}
            </span>
            <input
              aria-label="Choose a PDF report"
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy || !enabled}
              onChange={(e) => choose(e.target.files?.[0])}
            />
            <small>PDF · Up to 4 MB · Up to 100 pages</small>
          </label>
          <p className="fine-print">
            Text PDFs, tables, charts and legible scans. Poor scans may receive
            a provisional assessment. We’ll tell you what couldn’t be read.
          </p>
        </>
      ) : (
        <div className="discovery">
          <form onSubmit={search}>
            <label>
              Organisation name
              <input
                name="organisation"
                placeholder="For example, your charity or social enterprise"
                minLength={2}
                maxLength={160}
                required
                disabled={busy}
              />
            </label>
            <button className="button secondary" disabled={busy || !enabled}>
              {busy ? "Searching public reports…" : "Find reports"}
              <Arrow />
            </button>
          </form>
          {candidates && (
            <div className="search-results">
              {!candidates.length ? (
                <div className="alert">
                  We couldn’t verify an accessible report. Try a more specific
                  name or upload your PDF.
                </div>
              ) : (
                <>
                  <p>
                    Check the organisation and source carefully. Choose the
                    report you want us to review.
                  </p>
                  {candidates.map((c) => (
                    <div
                      className={
                        "candidate " +
                        (selection?.url === c.url ? "selected" : "")
                      }
                      key={c.url}
                    >
                      <label>
                        <input
                          type="radio"
                          name="candidate"
                          checked={selection?.url === c.url}
                          onChange={() => setSelection(c)}
                        />
                        <span>
                          <strong>{c.title}</strong>
                          <small>
                            {c.source} ·{" "}
                            {c.year || "Reporting year not verified"}
                          </small>
                          <small>Search: {c.organisation}</small>
                        </span>
                      </label>
                      <a href={c.url} target="_blank" rel="noreferrer">
                        Check source ↗
                      </a>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
      <div className="consent-box">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I have permission to submit this report and agree to its processing
            by our AI service, as explained in the{" "}
            <a href="/privacy">privacy notice</a>.
          </span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={quality}
            onChange={(e) => setQuality(e.target.checked)}
          />
          <span>
            Optional: allow My Social Impact to inspect my detailed review for
            quality improvement.
          </span>
        </label>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {busy && progress > 0 && tab === "upload" && (
        <div role="status">
          <progress value={progress} max={100} />
          <p>
            {progress < 100
              ? `Uploading · ${progress}%`
              : "Upload received. Preparing your review…"}
          </p>
        </div>
      )}
      <button
        className="button primary full"
        disabled={
          !enabled ||
          busy ||
          !consent ||
          (tab === "upload" ? !file : !selection)
        }
        onClick={tab === "upload" ? upload : confirm}
      >
        {busy ? "Please wait…" : "Confirm report & start my free review"}
        <Arrow />
      </button>
      <p className="fine-print centered">
        Your report stays private. Both assessments are included. No card
        required.
      </p>
    </div>
  );
}
