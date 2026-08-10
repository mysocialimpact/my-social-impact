import type { Metadata } from "next";
import { ContactPage } from "../site-shell";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to My Social Impact about creating meaningful and measurable change.",
};

export default function Page() {
  return <ContactPage />;
}
