import type { Metadata } from "next";
import { PurposeWorksPage } from "../purpose-works";
import "../purpose-works.css";

export const metadata: Metadata = {
  title: "Purpose Works",
  description:
    "Purpose Works connects purpose, social impact, behavioural change and communications to help organisations build credible stakeholder trust.",
};

export default function Page() {
  return <PurposeWorksPage />;
}
