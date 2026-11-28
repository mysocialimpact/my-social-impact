import Image from "next/image";
import Link from "next/link";

export function Contact() {
  return (
    <section
      className="human-contact purpose-contact"
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="campaign-width purpose-composition">
        <div className="purpose-heading" data-reveal>
          <p className="chapter-label">05 / Our purpose. Our people.</p>
          <h2 id="contact-title">
            Imagine a world where social impact was taken as seriously as{" "}
            <em>financial performance.</em>
          </h2>
          <p>
            That’s the ambition behind My Social Impact. Meet the people who
            bring financial discipline, creative thinking and professional
            judgement to your review.
          </p>
        </div>
        <figure className="marcus-portrait">
          <Image
            src="/brand/marcus-warry.jpg"
            width={1122}
            height={1402}
            alt="Marcus Warry, co-founder of My Social Impact"
            sizes="(max-width: 700px) 90vw, 32vw"
          />
          <figcaption>
            Marcus Warry ACA · Co-founder, My Social Impact
          </figcaption>
        </figure>
        <div className="marcus-introduction">
          <h3>Meet the founders</h3>
          <p>
            Marcus Warry ACA and Dr Chris Arnold develop My Impact Director
            together.
          </p>
          <Link className="button primary" href="/about">
            About Marcus and Chris
          </Link>
          <p>
            <Link className="text-link" href="/about#contact">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
