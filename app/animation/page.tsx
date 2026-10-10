import type { Metadata } from "next";
import { SorpSalesJourney } from "../sorp-sales-journey";
import "../sorp-sales-journey.css";

export const metadata: Metadata = {
  title: "SORP sales journey | My Social Impact",
  description: "A free assessment of social impact and sustainability aspects of SORP 2026 reporting. Not a full SORP review.",
  robots: { index: false, follow: false },
};

export default function Page() { return <SorpSalesJourney />; }
