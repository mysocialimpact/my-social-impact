"use client";
import { useSession } from "./session";
import { ServiceContact } from "./service-contact";
import type { Service } from "@/lib/services";
export function LinkedServiceContact({
  service,
  reviewId,
}: {
  service: Service;
  reviewId?: string;
}) {
  const { user } = useSession();
  return (
    <ServiceContact
      service={service}
      source="service"
      reviewId={reviewId}
      canLinkReview={!!user && !user.anonymous && !!user.emailVerified}
      className="button primary"
    >
      Email Marcus about this service
    </ServiceContact>
  );
}
