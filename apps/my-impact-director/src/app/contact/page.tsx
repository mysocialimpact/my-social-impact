import { permanentRedirect } from "next/navigation";
import {
  contactService,
  serviceContactUrl,
  validReviewReference,
} from "@/lib/services";
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string | string[];
    review?: string | string[];
  }>;
}) {
  const { service, review } = await searchParams;
  permanentRedirect(
    serviceContactUrl(
      service && service !== "general" ? contactService(service) : undefined,
      validReviewReference(review),
    ),
  );
}
