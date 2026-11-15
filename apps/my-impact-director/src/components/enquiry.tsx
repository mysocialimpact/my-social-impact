"use client";
import { useState } from "react";
import { useSession, api } from "./session";
import { type Service } from "@/lib/services";
import { Arrow } from "./icons";
import Link from "next/link";
export function Enquiry({
  service,
  reviewId = null,
}: {
  service: Service;
  reviewId?: string | null;
}) {
  const { user } = useSession(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/visitor", { method: "POST" });
      await api("/api/enquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          service,
          message: f.get("message"),
          reviewId,
          shareReview: f.get("share") === "on",
          contactConsent: f.get("contact") === "on",
          name: f.get("name"),
          email: f.get("email"),
        }),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="enquiry" id="enquire">
      <div>
        <p className="eyebrow">GOOD CONVERSATIONS START SOMEWHERE.</p>
        <h2>
          What could we
          <br />
          <em>do together?</em>
        </h2>
        <p>
          Tell us a little about your organisation and what you’d like to
          achieve. No account needed.
        </p>
        <a className="text-link" href="mailto:marcus@mysocialimpact.org">
          Or email Marcus directly
          <Arrow diagonal />
        </a>
      </div>
      {sent ? (
        <div className="success" role="status">
          <h3>Your enquiry is saved.</h3>
          <p>
            It’s in the My Social Impact team’s enquiry inbox. We’ll use the
            email you provided to respond. You haven’t been subscribed to
            marketing.
          </p>
          {reviewId && (
            <Link href={"/reviews/" + reviewId}>Back to my review →</Link>
          )}
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="form-pair">
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                defaultValue={user?.anonymous ? "" : user?.name || ""}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={user?.email || ""}
                maxLength={254}
                required
              />
            </label>
          </div>
          <label>
            How can we help?
            <textarea
              name="message"
              minLength={10}
              maxLength={5000}
              required
              placeholder="A little context, and what you have in mind…"
            />
          </label>
          {reviewId && (
            <label className="checkbox">
              <input type="checkbox" name="share" />
              <span>
                Share the linked assessment findings with My Social Impact to
                help with this enquiry.
              </span>
            </label>
          )}
          <label className="checkbox">
            <input type="checkbox" name="contact" required />
            <span>
              My Social Impact may respond to this enquiry at the email above.
              This doesn’t subscribe me to marketing.
            </span>
          </label>
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Saving your enquiry…" : "Send my enquiry"}
            <Arrow />
          </button>
        </form>
      )}
    </section>
  );
}
