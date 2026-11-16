import type { Metadata } from "next";
import { Contact } from "@/components/contact";
export const metadata: Metadata = {
  title: "Contact — Talk to your Impact Director",
};
export default function ContactPage() {
  return <Contact standalone />;
}
