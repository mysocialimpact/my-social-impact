"use client";
import { useState } from "react";
import { useSession, api } from "./session";
import { activeServices, type Service } from "@/lib/services";
import { Arrow } from "./icons";
import Link from "next/link";
export function Enquiry({
  service,
  reviewId = null,
}: {
  service: Service | "general";
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
          service: f.get("service"),
          message: String(f.get("message") || ""),
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
    <div className="about-enquiry">
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
          <label>
            What is your enquiry about?
            <select name="service" defaultValue={service}>
              <option value="general">General enquiry</option>
              {activeServices.map(([key, value]) => (
                <option key={key} value={key}>
                  {value.name}
                </option>
              ))}
            </select>
          </label>
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
              maxLength={4800}
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
    </div>
  );
}
