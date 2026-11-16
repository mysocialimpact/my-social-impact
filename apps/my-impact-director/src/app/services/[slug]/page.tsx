import { LinkedServiceContact } from "@/components/linked-service-contact";
import { DigitalOffer } from "@/components/report-services";
import { notFound, permanentRedirect } from "next/navigation";
import { PageIntro } from "@/components/shell";
import { Enquiry } from "@/components/enquiry";
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
          <a href="#enquire" className="text-link">
            Start a conversation →
          </a>
        </aside>
      </div>
      <LinkedServiceContact
        service={slug as Service}
        reviewId={
          review && /^[a-f0-9-]{36}$/i.test(review) ? review : undefined
        }
      />
      <p className="fine-print">
        Choose direct email or copy Marcus’s address on the Contact page. Prefer
        to contact us here? Use the short form below.
      </p>
      {slug === "digitisation" && <DigitalOffer />}
      <Enquiry
        service={slug as Service}
        reviewId={review && /^[a-f0-9-]{36}$/i.test(review) ? review : null}
      />
    </section>
  );
}
