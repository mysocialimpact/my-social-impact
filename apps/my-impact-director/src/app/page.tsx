import Link from "next/link";
import Image from "next/image";
import { Intake } from "@/components/intake";
import { Arrow } from "@/components/icons";
import { ServiceStories } from "@/components/service-stories";
import { ready } from "@/lib/reviews";
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <>
      <section className="home-hero section">
        <div className="hero-intro">
          <p className="eyebrow">
            <span className="orange-dot" /> GOOD WORK DESERVES A GREAT IMPACT
            STORY.
          </p>
          <h1>
            How good is your
            <br />
            <em>impact report?</em>
          </h1>
          <p className="hero-lead">
            Get a free AI-powered review. Discover what works, what could be
            better, and how to make your impact story more credible and
            compelling.
          </p>
        </div>
        <Intake enabled={ready()} hero />
        <div className="hero-bottom">
          <p>
            For charities. Social enterprises.
            <br />
            And everyone trying to make a difference.
          </p>
          <span>
            Two frameworks.
            <br />
            <strong>One clearer way forward.</strong>
          </span>
          <a
            href="#how-it-works"
            className="scroll-cue"
            aria-label="Explore how it works"
          >
            Explore
            <Arrow />
          </a>
        </div>
      </section>
      <section className="how-editorial section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</p>
          <h2>
            Arrive. Upload.
            <br />
            <em>Discover. Improve.</em>
          </h2>
          <p>
            No account to create. No form to negotiate. Just your report, a
            thoughtful review, and somewhere useful to start.
          </p>
        </div>
        <ol className="journey-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Bring your report.</h3>
              <p>
                Drop in a PDF or find a published report. Your document stays
                private.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Look at it differently.</h3>
              <p>
                Explore two assessments, grounded in your evidence. See
                strengths, risks and opportunities.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Know what to do next.</h3>
              <p>
                Get practical improvements. Download your review, save it if you
                want, or bring in an expert.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section className="framework-editorial">
        <div className="section">
          <div className="framework-intro">
            <p className="eyebrow">TWO COMPLEMENTARY LENSES</p>
            <h2>
              A good story.
              <br />
              <em>With the evidence to match.</em>
            </h2>
            <p>
              Credible claims and thoughtful impact management ask different
              questions. Your review gives both the attention they deserve.
            </p>
          </div>
          <article className="framework-feature">
            <div className="framework-identity">
              <Image
                src="/brand/claims-code.png"
                alt="Social Impact Claims Code"
                width={1078}
                height={1090}
                sizes="(max-width:700px) 180px, 300px"
              />
            </div>
            <div>
              <span className="framework-label">
                01 / CREDIBILITY & INTEGRITY
              </span>
              <h3>
                Can your claims
                <br />
                <em>stand up?</em>
              </h3>
              <p>
                How credible and well-supported are the impact claims? We look
                at what you say, what supports it, and whether the two add up.
              </p>
              <ol className="principle-line">
                {[
                  "Evidence",
                  "Proportion",
                  "Transparency",
                  "Balance",
                  "Learning",
                ].map((p, i) => (
                  <li key={p}>
                    <span>0{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
              <a
                href="https://mysocialimpact.org/social-impact-claims-code"
                className="text-link"
              >
                Explore the Social Impact Claims Code
                <Arrow diagonal />
              </a>
            </div>
          </article>
          <article className="framework-feature excellence-feature">
            <div className="framework-identity">
              <Image
                src="/brand/excellence.png"
                alt="Social Impact Excellence"
                width={1200}
                height={1200}
                sizes="(max-width:700px) 180px, 300px"
              />
            </div>
            <div>
              <span className="framework-label">
                02 / PURPOSE INTO PRACTICE
              </span>
              <h3>
                What does your report
                <br />
                <em>really demonstrate?</em>
              </h3>
              <p>
                What does the report show about your organisation’s approach to
                understanding, managing and communicating impact?
              </p>
              <ol className="principle-line">
                {[
                  "Purpose",
                  "Leadership",
                  "Data",
                  "Delivery",
                  "Communications",
                ].map((p, i) => (
                  <li key={p}>
                    <span>0{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
              <a
                href="https://socialimpactexcellence.org"
                className="text-link"
              >
                Discover Social Impact Excellence
                <Arrow diagonal />
              </a>
            </div>
          </article>
          <p className="framework-caveat">
            40 focused checks. Source-linked findings. Clear explanations.
            <br />
            <Link href="/methodology">
              An automated document review, not independent assurance. Read how
              we assess.
            </Link>
          </p>
        </div>
      </section>
      <section className="expert-section section" id="expert-help">
        <div className="expert-heading">
          <p className="eyebrow">
            TECHNOLOGY GETS YOU STARTED. PEOPLE TAKE YOU FURTHER.
          </p>
          <h2>
            Free insight.
            <br />
            <em>Expert help, when you need it.</em>
          </h2>
          <p>
            Take your review and run with it. Or work with My Social Impact to
            turn the next step into something exceptional.
          </p>
        </div>
        <ServiceStories />
      </section>
      <section className="vision-section">
        <div className="section vision-inner">
          <p className="eyebrow">THE WORLD WE’RE WORKING TOWARDS</p>
          <h2>
            Imagine a world where <br />
            <em>social impact</em> was taken <br />
            as seriously as <br />
            <span>financial performance.</span>
          </h2>
          <div className="vision-bottom">
            <span className="vision-rule" />
            <p>
              My Impact Director is a social enterprise initiative developed by
              My Social Impact. We’re making expert impact understanding and
              management more accessible, so more organisations can make a
              greater difference.
            </p>
            <a href="https://mysocialimpact.org" className="text-link">
              Meet My Social Impact
              <Arrow diagonal />
            </a>
          </div>
        </div>
      </section>
      <section className="future-section section">
        <div>
          <span className="coming-tag">COMING NEXT</span>
          <h2>
            What if every organisation had
            <br />
            <em>its own Impact Director?</em>
          </h2>
        </div>
        <p>
          An affordable intelligent partner to understand evidence, track
          progress, challenge assumptions and keep improving. We believe agentic
          AI could make this possible.
          <br />
          <strong>
            The ambition is bigger. Your report is a good place to start.
          </strong>
        </p>
      </section>
    </>
  );
}
