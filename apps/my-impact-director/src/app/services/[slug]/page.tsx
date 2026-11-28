import { LinkedServiceContact } from "@/components/linked-service-contact";
import { DigitalOffer } from "@/components/report-services";
import { notFound, permanentRedirect } from "next/navigation";
import { PageIntro } from "@/components/shell";

import { services, type Service } from "@/lib/services";
export default async function ServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const { slug } = await params;
  if (!Object.hasOwn(services, slug)) notFound();
  if (slug === "essentials") permanentRedirect("/#human-support");
  const service = services[slug as Service];
  const review = (await searchParams).review;
  return (
    <section className="section">
      <div className="service-hero">
        <PageIntro label={service.name} title={service.heading}>
          <p>{service.intro}</p>
        </PageIntro>
        <aside className="service-detail">
          <h2>How we can help</h2>
          <ul>
            {service.benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </aside>
      </div>
      {slug === "digitisation" && <DigitalOffer />}
      <div id="enquire">
        <LinkedServiceContact
          service={slug as Service}
          reviewId={
            review && /^[a-f0-9-]{36}$/i.test(review) ? review : undefined
          }
        />
      </div>
    </section>
  );
}
