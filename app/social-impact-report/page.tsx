import type { Metadata } from "next";
import { CharityImpactReportsPage } from "../charity-impact-reports";

export const metadata: Metadata = {
  title: "Charity Impact Reports",
  description: "Charity Impact Reports and year-round impact support for clearer evidence, stronger decisions and SORP 2026 readiness.",
};

export default function Page() { return <CharityImpactReportsPage />; }
