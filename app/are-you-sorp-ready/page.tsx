import type { Metadata } from "next";
import { SorpSalesLanding } from "../sorp-sales-journey";
import "../sorp-sales-journey.css";

export const metadata: Metadata = {
  title: "Are You SORP Ready?",
  description: "A free SORP 2026 impact-readiness tool for charities from My Social Impact.",
};

export default function Page() {
  return <SorpSalesLanding />;
}
