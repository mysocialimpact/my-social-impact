import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CopyMarcusEmail } from "@/components/service-contact";
import { Enquiry } from "@/components/enquiry";
import {
  contactService,
  serviceMailto,
  validReviewReference,
} from "@/lib/services";
import "./about.css";

export const metadata: Metadata = {
  title: "About us — Marcus Warry and Dr Chris Arnold",
  description:
    "Meet the people behind My Impact Director and get in touch with My Social Impact about your review, your evidence or your next steps.",
  alternates: { canonical: "/about" },
};

const founders = [
  {
    name: "Marcus Warry ACA",
    image: "/brand/marcus-warry.jpg",
    email: "marcus@mysocialimpact.org",
    role: "Chartered Accountant and Social Impact Consultant",
    bio: "Marcus brings the discipline of financial reporting to social impact. His work in accounting, audit and finance shaped the questions he asks about evidence. Strategy and entrepreneurship taught him to ask what an organisation can actually change.",
    practice:
      "He helps teams choose measures they can use, account for what happened and turn their findings into practical decisions.",
  },
  {
    name: "Dr Chris Arnold",
    image: "/brand/chris-arnold.webp",
    email: "chris@mysocialimpact.org",
    role: "Creative Strategist, Social Impact Strategist and Thought Architect",
    bio: "Chris is a former creative and board director at Saatchi & Saatchi. His work spans ethical marketing, communication, community engagement and behavioural change.",
    practice:
      "He helps teams question familiar assumptions. Listening to the people closest to a problem can change how you describe it, the story you tell and what you try next.",
  },
];

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string | string[];
    review?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const service =
    typeof params.service === "string" && params.service !== "general"
      ? contactService(params.service)
      : "general";
  const reviewId = validReviewReference(params.review);
  return (
    <article className="about-page">
      <header className="about-wrap about-opening">
        <div>
          <p className="about-kicker">About My Impact Director</p>
          <h1>
            Behind the intelligence,
            <br />
            <em>there are people.</em>
          </h1>
        </div>
        <div className="about-lede">
          <p>
            We believe every organisation deserves access to better intelligence
            about its impact.
          </p>
          <p>
            My Impact Director brings together powerful AI, professional
            experience, creativity and human judgement to help organisations
            understand their impact and make meaningful improvements.
          </p>
          <p className="about-philosophy">
            <a href="#human-judgement">
              Good intelligence informs. Human intelligence transforms.
            </a>
          </p>
        </div>
      </header>
      <section className="about-wrap founders" aria-label="Meet the founders">
        {founders.map((f) => (
          <article key={f.name} className="founder-profile">
            <div className="founder-photo">
              <Image
                src={f.image}
                alt={f.name}
                width={1122}
                height={1402}
                sizes="(max-width: 650px) 90vw, (max-width: 1400px) 45vw, 590px"
              />
            </div>
            <div className="founder-caption">
              <p className="about-kicker">Co-founder, My Social Impact</p>
              <h2>{f.name}</h2>
              <p className="founder-role">{f.role}</p>
              <p>{f.bio}</p>
              <p>{f.practice}</p>
              <a href={"mailto:" + f.email}>{f.email}</a>
            </div>
          </article>
        ))}
      </section>
      <section
        className="about-wrap about-purpose"
        aria-labelledby="purpose-title"
      >
        <h2 id="purpose-title">Our purpose</h2>
        <div>
          <p>
            My Impact Director is developed by{" "}
            <a href="https://www.mysocialimpact.org/">My Social Impact</a>, a
            consultancy working to make impact measurement, evidence, reporting
            and professional support accessible to organisations of every size.
          </p>
          <p>
            A small charity or social enterprise can start with a free AI review
            of its report. We’re developing more advanced paid reviews for teams
            that want deeper analysis. Our human-led services are available now
            for organisations that want to work through the findings with a
            professional.
          </p>
          <Link href="/#intelligence">Explore the intelligence options</Link>
        </div>
      </section>
      <section className="about-together">
        <div className="about-wrap about-pair">
          <div>
            <h2>
              Different minds.
              <br />
              <em>Shared purpose.</em>
            </h2>
            <p>
              Marcus might ask what evidence supports a claim. Chris might ask
              whose experience the evidence leaves out. Together, those
              questions help a team tell a more credible story and decide where
              to act.
            </p>
          </div>
          <div className="about-human" id="human-judgement">
            <h3>
              Good intelligence informs.
              <br />
              <em>Human intelligence transforms.</em>
            </h3>
            <p>
              AI can review a document, analyse evidence and suggest
              improvements. Understanding an organisation takes time with its
              people. We listen, ask difficult questions and build the trust it
              takes to put a decision into practice.
            </p>
          </div>
        </div>
      </section>
      <section
        className="about-contact"
        id="contact"
        tabIndex={-1}
        aria-labelledby="about-contact-title"
      >
        <div className="about-wrap about-contact-grid">
          <div>
            <p className="about-kicker">Contact</p>
            <h2 id="about-contact-title">
              Let’s talk about
              <br />
              <em>your impact.</em>
            </h2>
            <p>
              Whether you have a question about your review, want help improving
              your report, or simply have an idea you’d like to explore, we’d be
              delighted to hear from you.
            </p>
            <address>
              {founders.map((f) => (
                <div key={f.email}>
                  <strong>{f.name}</strong>
                  <a
                    href={
                      service === "general"
                        ? "mailto:" + f.email
                        : serviceMailto(service, f.email)
                    }
                  >
                    {f.email}
                  </a>
                </div>
              ))}
            </address>
            <CopyMarcusEmail />
            <p className="about-booking">
              Sending an enquiry is free. A Human Intelligence appointment is a
              separate paid service.
            </p>
          </div>
          <Enquiry
            key={service + ":" + reviewId}
            service={service}
            reviewId={reviewId}
          />
        </div>
      </section>
    </article>
  );
}
