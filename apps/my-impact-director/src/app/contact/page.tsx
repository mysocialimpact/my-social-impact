import type { Metadata } from "next";
import { contactService } from "@/lib/services";
import { Contact } from "@/components/contact";
export const metadata: Metadata = {
  title: "Contact — Talk to your Impact Director",
};
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string | string[] }>;
}) {
  const { service } = await searchParams;
  return <Contact standalone service={contactService(service)} />;
}
