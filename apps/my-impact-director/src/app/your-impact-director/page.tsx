import { permanentRedirect } from "next/navigation";
import { services } from "@/lib/services";
export default async function FormerSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string; review?: string }>;
}) {
  const q = await searchParams;
  if (q.interest || q.review) {
    const service =
      q.interest && Object.hasOwn(services, q.interest)
        ? q.interest
        : "human-director";
    const review =
      q.review && /^[a-f0-9-]{36}$/i.test(q.review)
        ? `?review=${q.review}`
        : "";
    permanentRedirect(`/services/${service}${review}#enquire`);
  }
  permanentRedirect("/#human-support");
}
