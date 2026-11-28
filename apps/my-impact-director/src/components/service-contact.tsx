"use client";
import { useState } from "react";
import { Arrow } from "./icons";
import {
  MARCUS_EMAIL,
  serviceMailto,
  serviceContactUrl,
  type Service,
} from "@/lib/services";

export function ServiceContact({
  service,
  children,
  source = "homepage",
  reviewId,
  canLinkReview = false,
  className = "text-link",
  destination,
}: {
  service: Service;
  children: React.ReactNode;
  source?: "homepage" | "review" | "contact" | "service" | "pricing";
  reviewId?: string;
  canLinkReview?: boolean;
  className?: string;
  destination?: "contact" | "email";
}) {
  const [linkReview, setLinkReview] = useState(false);
  return (
    <div className="service-contact-action">
      {reviewId && canLinkReview && (
        <label className="checkbox intent-consent">
          <input
            type="checkbox"
            checked={linkReview}
            onChange={(e) => setLinkReview(e.target.checked)}
          />
          <span>
            Link this review to my contact interest. Findings stay private.
          </span>
        </label>
      )}
      <a
        className={className}
        href={
          (destination ?? (source === "contact" ? "email" : "contact")) ===
          "email"
            ? serviceMailto(service)
            : serviceContactUrl(service, linkReview ? reviewId : undefined)
        }
        onClick={() => {
          // Contact navigation is immediate. Tracking never blocks it or claims an enquiry was sent.
          void fetch("/api/service-intents", {
            method: "POST",
            headers: { "content-type": "application/json" },
            keepalive: true,
            body: JSON.stringify({
              kind: "contact",
              service,
              source,
              reviewId: linkReview ? reviewId : null,
            }),
          }).catch(() => {});
        }}
      >
        {children}{" "}
        <span aria-hidden="true">
          <Arrow diagonal />
        </span>
      </a>
    </div>
  );
}

export function CopyMarcusEmail() {
  const [message, setMessage] = useState("");
  return (
    <div className="copy-email">
      <button
        type="button"
        className="text-link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(MARCUS_EMAIL);
            setMessage("Email address copied.");
          } catch {
            setMessage(`Copy this address: ${MARCUS_EMAIL}`);
          }
        }}
      >
        Copy Marcus’s email address
      </button>
      <span role="status">{message}</span>
    </div>
  );
}

export function recordVisit() {
  try {
    if (sessionStorage.getItem("mid-visit-counted-v1")) return;
    const returning = localStorage.getItem("mid-visited-v1") === "yes";
    sessionStorage.setItem("mid-visit-counted-v1", "yes");
    localStorage.setItem("mid-visited-v1", "yes");
    void fetch("/api/service-intents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ kind: "visit", returning }),
    }).catch(() => {});
  } catch {
    /* Contact and reviews work even when browser storage is disabled. */
  }
}
