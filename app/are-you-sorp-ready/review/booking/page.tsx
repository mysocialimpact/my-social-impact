import type { Metadata } from "next";
import Link from "next/link";
import { SorpReviewBooking } from "../../../sorp-review-booking";
import "../../../sorp-ready.css";

export const metadata: Metadata = { title: "Book a SORP review — My Social Impact", description: "A free fit check, a £50 SORP readiness review, or a £100 SORP and wider-evidence review.", robots: { index: false, follow: false } };

export default function Page() {
  return <main className="sorp-booking-share-page"><header className="sorp-workspace-brand"><Link href="/are-you-sorp-ready/review"><span>My Social Impact</span><strong>Are You SORP Ready?</strong></Link></header><Link href="/are-you-sorp-ready/review">← BACK TO MY SORP REVIEW</Link><SorpReviewBooking shared /></main>;
}
