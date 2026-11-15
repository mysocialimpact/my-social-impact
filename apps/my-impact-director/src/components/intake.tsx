"use client";
import { useState } from "react";
import { api } from "./session";
import { Arrow, DocumentIcon } from "./icons";
import type { Candidate } from "@/lib/discovery";

export function Intake({
  enabled,
  hero = false,
}: {
  enabled: boolean;
  hero?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null),
    [consent, setConsent] = useState(false),
    [quality, setQuality] = useState(false),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [drag, setDrag] = useState(false),
    [candidates, setCandidates] = useState<Candidate[] | null>(null),
    [selection, setSelection] = useState<Candidate | null>(null),
    [find, setFind] = useState(false);
  function choose(value: File | undefined) {
    if (!enabled || busy || !value) return;
    setError("");
    setSelection(null);
    setConsent(false);
    if (
      !value.name.toLowerCase().endsWith(".pdf") ||
      value.size > 4_000_000 ||
      value.size === 0
    ) {
      setError("Choose a PDF up to 4 MB. Your file hasn’t been uploaded.");
      return;
    }
    setFile(value);
  }
  async function upload() {
    if (!file || !consent || !enabled || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/visitor", { method: "POST" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
      return;
    }
    const data = new FormData();
    data.set("file", file);
    data.set("consent", String(consent));
    data.set("qualityConsent", String(quality));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/reviews");
    xhr.timeout = 120000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) throw Error(d.error);
        window.location.assign("/reviews/" + d.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Please try again.");
        setBusy(false);
      }
    };
    xhr.onerror = xhr.ontimeout = () => {
      setError(
        "The connection was interrupted. Please try again; an identical upload won’t create a second review.",
      );
      setBusy(false);
    };
    xhr.send(data);
  }
  async function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const organisation = new FormData(e.currentTarget).get("organisation");
    setBusy(true);
    setError("");
    setCandidates(null);
    setSelection(null);
    try {
      await api("/api/visitor", { method: "POST" });
      const d = await api("/api/discovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "search", organisation }),
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
    <div
      className={"intake upload-studio" + (hero ? " upload-hero" : "")}
      id={hero ? "upload" : undefined}
    >
      {!enabled && (
        <p className="intake-notice" role="status">
          <strong>Reviews are temporarily paused.</strong> We’re checking the
          live assessment service. You can explore the methodology or ask for
          expert help.
        </p>
      )}
      <div className="upload-topline">
        <span>YOUR REPORT. A FRESH PERSPECTIVE.</span>
        <span>100% FREE</span>
      </div>
      {!find ? (
        <label
          className={
            "dropzone " + (drag ? "dragging " : "") + (file ? "has-file" : "")
          }
          onDragOver={(e) => {
            e.preventDefault();
            if (enabled) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            choose(e.dataTransfer.files[0]);
          }}
        >
          <span className="upload-icon">
            <DocumentIcon />
            <span aria-hidden="true">+</span>
          </span>
          <strong>{file ? file.name : "Drop your impact report here"}</strong>
          <span>
            {file
              ? `${(file.size / 1_000_000).toFixed(2)} MB · Ready when you are`
              : "or choose a PDF from your device"}
          </span>
          <span className="choose-file">
            {file ? "Choose a different file" : "Choose a PDF"}
            <Arrow />
          </span>
          <input
            aria-label="Choose a PDF report"
            type="file"
            accept="application/pdf,.pdf"
            disabled={!enabled || busy}
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <small>PDF · Up to 4 MB · Up to 100 pages</small>
        </label>
      ) : (
        <div className="discovery">
          <form onSubmit={search}>
            <label>
              Organisation name
              <input
                name="organisation"
                minLength={2}
                maxLength={160}
                placeholder="The organisation that published the report"
                required
                disabled={busy}
              />
            </label>
            <button className="button primary" disabled={busy || !enabled}>
              {busy ? "Finding public reports…" : "Find reports"}
              <Arrow />
            </button>
          </form>
          {candidates?.length === 0 && (
            <p role="status">
              We couldn’t verify an accessible PDF. Try another name or upload
              your report.
            </p>
          )}
          {candidates?.map((c) => (
            <div
              className={
                "candidate " + (selection?.url === c.url ? "selected" : "")
              }
              key={c.url}
            >
              <label>
                <input
                  type="radio"
                  name="candidate"
                  checked={selection?.url === c.url}
                  onChange={() => {
                    setSelection(c);
                    setConsent(false);
                  }}
                />
                <span>
                  <strong>{c.title}</strong>
                  <small>
                    {c.source} · {c.year || "Year not verified"}
                  </small>
                </span>
              </label>
              <a href={c.url} target="_blank" rel="noreferrer">
                Check source ↗
              </a>
            </div>
          ))}
        </div>
      )}
      {((file && !find) || (selection && find)) && (
        <div className="upload-confirm">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I have permission to share this report for AI processing, as
              explained in the <a href="/privacy">privacy notice</a>.
            </span>
          </label>
          <details className="optional-consent">
            <summary>Optional quality-improvement permission</summary>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={quality}
                onChange={(e) => setQuality(e.target.checked)}
              />
              <span>
                Allow My Social Impact to inspect my detailed review to improve
                the service.
              </span>
            </label>
          </details>
          <button
            className="button primary full"
            disabled={!consent || !enabled || busy}
            onClick={find ? confirm : upload}
          >
            {busy ? "Preparing your review…" : "Review my report — free"}
            <Arrow />
          </button>
        </div>
      )}
      {busy && progress > 0 && (
        <div role="status">
          <progress value={progress} max={100} aria-label="Upload progress" />
          <p>
            {progress < 100
              ? `Uploading ${progress}%`
              : "Your PDF is uploaded. Preparing the evidence review…"}
          </p>
        </div>
      )}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <div className="upload-foot">
        <p>
          <span aria-hidden="true">↗</span> No sign-up. No email. Your results
          first.
        </p>
        <button
          className="subtle-button"
          disabled={busy}
          onClick={() => {
            setFind(!find);
            setConsent(false);
            setError("");
          }}
        >
          {find ? "Upload a PDF instead" : "Find a published report"}
        </button>
      </div>
      <p className="upload-privacy">
        Private to this browser for 7 days. Download or save after your review.
      </p>
    </div>
  );
}
