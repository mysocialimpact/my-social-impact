"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAX_FILE, MAX_FILE_LABEL } from "@/lib/file-limits";
import {
  prepareTransfer,
  transferFile,
  type Transfer,
} from "./upload-transfer";
import { api } from "./session";
import { Arrow } from "./icons";
import type { Candidate } from "@/lib/discovery";

export function UploadShortcut() {
  return (
    <button
      type="button"
      className="mobile-upload"
      onClick={() => document.getElementById("hero-report-file")?.click()}
    >
      <span>First job: review your report. Free.</span>
      <strong>
        Let’s get started — free <Arrow />
      </strong>
    </button>
  );
}
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
  const errorPanel = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (error)
      errorPanel.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
  }, [error]);
  const transfer = useRef<Transfer | null>(null),
    path = usePathname();
  function choose(value: File | undefined) {
    if (!enabled || busy || !value) return;
    setError("");
    setSelection(null);
    setConsent(false);
    if (!value.name.toLowerCase().endsWith(".pdf") || value.size < 40) {
      setFile(null);
      setError(
        "We couldn’t recognise this file as a PDF. Please try a PDF version of your report.",
      );
      return;
    }
    if (value.size > MAX_FILE) {
      setFile(null);
      setError(
        `This report is larger than the ${MAX_FILE_LABEL} we can currently accept. You can try a smaller PDF, or tell us what you need using the link below.`,
      );
      return;
    }
    if (transfer.current)
      void api(`/api/uploads/${transfer.current.id}`, {
        method: "DELETE",
      }).catch(() => {});
    transfer.current = null;
    setProgress(0);
    setFile(value);
    if (hero)
      document.getElementById("upload")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  }
  async function upload() {
    if (!file || !consent || !enabled || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/visitor", { method: "POST" });
      if (!transfer.current || transfer.current.file !== file)
        transfer.current = await prepareTransfer(file);
      await transferFile(transfer.current, setProgress);
      const review = await api(`/api/uploads/${transfer.current.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consent, qualityConsent: quality }),
      });
      window.location.assign("/reviews/" + review.id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The upload was interrupted. Please try again — we’ve kept your selected report.",
      );
      setBusy(false);
    }
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
        <span>Give your Impact Director its first job.</span>
        <span>No registration required.</span>
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
          <strong>{file ? file.name : "Drop your PDF here"}</strong>
          <span>
            {file
              ? `${(file.size / 1_000_000).toFixed(2)} MB · Ready when you are`
              : "or choose a PDF from your device"}
          </span>
          <span className="choose-file">
            {file
              ? "Choose a different file"
              : hero
                ? "Let’s get started — free"
                : "Choose a PDF"}
            <Arrow />
          </span>
          <input
            id={hero ? "hero-report-file" : "report-file"}
            aria-label="Choose a PDF report"
            type="file"
            accept="application/pdf,.pdf"
            disabled={!enabled || busy}
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <small>PDF · Up to {MAX_FILE_LABEL} · Up to 100 pages</small>
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
                Check source <Arrow diagonal />
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
        <section
          ref={errorPanel}
          className="alert error upload-failure"
          role="alert"
        >
          <h3>
            We’re really sorry — we haven’t been able to do what you wanted.
          </h3>
          <p>{error}</p>
          <Link
            href={`/feedback?from=${encodeURIComponent(path)}&issue=upload`}
          >
            Help us make this better <Arrow />
          </Link>
          <p className="failure-help">
            Please tell us what went wrong so we can improve it. Your report
            won’t be shared through this feedback link.
          </p>
        </section>
      )}
      <div className="upload-foot">
        <p>No sign-up. No email. Your results first.</p>
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
      <p className="review-disclosure">
        Choose any free methodology after upload. Headline results need no
        email. Full detailed reports are free with verified email delivery .
      </p>
      <p className="upload-privacy">
        Private to this browser for 7 days. Download or save after your review.
      </p>
    </div>
  );
}
