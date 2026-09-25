import type { Metadata } from "next";
import { SorpPublicReview } from "../sorp-public-review";

export const metadata: Metadata = {
  title: "Are You SORP Ready?",
  description: "A free SORP 2026 published-evidence readiness review: your statutory reporting, wider evidence, source-grounded findings and practical priorities.",
};

export default function Page() {
  return <SorpPublicReview />;
}
