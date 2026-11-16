import { Contact } from "@/components/contact";
import { Arrow } from "@/components/icons";
import Link from "next/link";
import Image from "next/image";
import { Intake, UploadShortcut } from "@/components/intake";
import { ServiceStories } from "@/components/service-stories";
import { ready } from "@/lib/reviews";
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <div className="campaign">
      <section className="director-opening" aria-labelledby="director-title">
        <div className="director-identity">
          <h1 id="director-title">
            MY IMPACT
            <br />
            <span>DIRECTOR.</span>
          </h1>
          <p className="director-proposition">
            Expert impact management.
            <br />
            <em>For everyone.</em>
          </p>
          <p className="director-promise">
            Making expert impact management affordable for every organisation.
          </p>
          <p className="director-audience">
            Charities. Social enterprises. NGOs.
            <br />
            Purpose-driven businesses.
          </p>
          <p className="director-credit">
            A social enterprise initiative
            <br />
            developed by{" "}
            <a href="https://mysocialimpact.org">
              My Social Impact <Arrow diagonal />
            </a>
          </p>
          <UploadShortcut />
        </div>
        <div className="director-first-job">
          <div className="first-job-heading">
            <p>Your new Impact Director’s first job?</p>
            <h2>
              REVIEW YOUR
              <br />
              IMPACT REPORT.
            </h2>
            <div className="job-price">
              <strong>For free.</strong>
              <span>£0</span>
            </div>
            <p>
              Upload your PDF. Choose either of two evidence-based reviews, with
              practical recommendations.
            </p>
          </div>
          <Intake enabled={ready()} hero />
        </div>
      </section>
      <section
        className="today-moment campaign-width"
        id="how-it-works"
        aria-labelledby="today-title"
      >
        <div className="moment-intro">
          <h2 id="today-title">
            One report.
            <br />
            <em>Two perspectives.</em>
          </h2>
          <p>
            Upload. Review. Discover. Improve.
            <br />
            Forty focused checks. Your evidence. Clear next steps.
          </p>
        </div>
        <div className="framework-lines">
          <a
            href="https://mysocialimpact.org/social-impact-claims-code"
            className="framework-line"
          >
            <Image
              src="/brand/claims-code.png"
              alt="Social Impact Claims Code"
              width={1078}
              height={1090}
              sizes="(max-width: 700px) 85px, 120px"
            />
            <div>
              <h3>
                Can your impact claims
                <br />
                stand up to scrutiny?
              </h3>
              <p>Evidence. Proportion. Transparency. Balance. Learning.</p>
            </div>
            <span className="line-arrow" aria-hidden="true">
              <Arrow diagonal />
            </span>
          </a>
          <a
            href="https://socialimpactexcellence.org"
            className="framework-line"
          >
            <Image
              src="/brand/excellence.png"
              alt="Social Impact Excellence"
              width={1200}
              height={1200}
              sizes="(max-width: 700px) 85px, 120px"
            />
            <div>
              <h3>
                What does your report show
                <br />
                about managing impact?
              </h3>
              <p>Purpose. Leadership. Data. Delivery. Communications.</p>
            </div>
            <span className="line-arrow" aria-hidden="true">
              <Arrow diagonal />
            </span>
          </a>
        </div>
        <div className="methodology-line">
          <p>
            An automated document review. Indicative findings, with source
            references.
          </p>
          <Link href="/methodology">
            How we assess your report <Arrow diagonal />
          </Link>
        </div>
      </section>
      <section className="expert-moment" aria-labelledby="expert-title">
        <div className="campaign-width expert-layout">
          <div>
            <h2 id="expert-title">
              AI gets you started.
              <br />
              <em>People take you further.</em>
            </h2>
            <p>
              Professional help from My Social Impact.
              <br />
              Paid services, available by enquiry.
            </p>
          </div>
          <ServiceStories />
        </div>
      </section>
      <section className="purpose-moment" aria-labelledby="purpose-title">
        <div className="campaign-width">
          <h2 id="purpose-title">
            Imagine a world where <em>social impact</em> was taken as seriously
            as financial performance.
          </h2>
          <div className="purpose-base">
            <p>
              That’s the vision of My Social Impact — and the reason we’re
              making expert impact management accessible to everyone.
            </p>
            <div>
              <h3>What if every organisation had its own Impact Director?</h3>
              <p>
                A future intelligent partner for ongoing impact management.{" "}
                <strong>Coming next.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>
      <Contact />
    </div>
  );
}
