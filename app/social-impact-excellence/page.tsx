import type { Metadata } from "next";
import { SocialImpactExcellencePage } from "../social-impact-excellence";
import "../social-impact-excellence.css";

export const metadata: Metadata = {
  title: "Social Impact Excellence",
  description: "My Social Impact’s flagship methodology for embedding purpose, leadership, data, delivery and communications into one practical management system.",
};

export default function Page() {
  return <SocialImpactExcellencePage />;
}
