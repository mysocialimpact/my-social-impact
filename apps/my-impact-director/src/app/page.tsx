import { Contact } from "@/components/contact";
import { Arrow } from "@/components/icons";
import Link from "next/link";
import Image from "next/image";
import { Intake, UploadShortcut } from "@/components/intake";
import { SupportIntroduction } from "@/components/support-introduction";
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
            Your own Impact Director.
            <br />
            <em>Without the full-time salary.</em>
          </p>
          <p className="director-promise">
            Making expert impact management affordable for every organisation.
            Human-led. AI-powered.
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
              Upload your PDF. Choose any of three complementary reviews, with
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
            <em>Three perspectives.</em>
          </h2>
          <p>
            Upload. Review. Discover. Improve.
            <br />
            Three distinct questions. Your evidence. Clear next steps.
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
          <Link
            href="/methodology/impact-report-excellence"
            className="framework-line"
          >
            <Image
              src="/brand/impact-report-excellence.svg"
              alt="Impact Report Excellence"
              width={120}
              height={120}
            />
            <div>
              <h3>
                Does your impact report
                <br />
                make an impact?
              </h3>
              <p>Clarity. Storytelling. Design. Engagement. Communication.</p>
            </div>
            <span className="line-arrow" aria-hidden="true">
              <Arrow diagonal />
            </span>
          </Link>
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
      <SupportIntroduction />
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
                Experienced people. Social Impact Excellence. Powerful AI.
                <Link href="/your-impact-director">
                  {" "}
                  Explore ongoing support →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
      <Contact />
    </div>
  );
}
