import type { Metadata } from "next";
import { SocialImpactClaimsCodePage } from "../social-impact-claims-code";
import "../claims-code.css";

export const metadata: Metadata = {
  title: "Social Impact Claims Code",
  description:
    "A practical, principle-based framework for making trustworthy social and environmental impact claims. Evidence, transparency, proportionality, judgement and trust.",
};

export default function Page() {
  return <SocialImpactClaimsCodePage />;
}
