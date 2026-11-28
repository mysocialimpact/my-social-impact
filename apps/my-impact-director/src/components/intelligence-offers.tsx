import Image from "next/image";
import Link from "next/link";
import { Arrow } from "./icons";

const aiLevels = [
  {
    name: "Everyday AI",
    price: "Free",
    promise: "Useful intelligence for everyone.",
    description:
      "Upload one report to try all three standard assessment frameworks. Efficient AI examines the evidence and gives you practical recommendations. We cover the operating cost.",
  },
  {
    name: "Advanced AI",
    price: "£19",
    promise: "Explore further. Challenge more.",
    description:
      "A deeper second opinion from a more capable AI model. It looks more closely at key findings, the evidence behind them and what you could improve. Your score can move in either direction.",
  },
  {
    name: "Ultimate AI",
    price: "£29",
    promise: "Our most thorough AI assessment.",
    description:
      "A further check of consequential findings and conflicting evidence, with a clearer account of where the evidence leaves room for judgement. Only £10 more than Advanced.",
  },
] as const;

export function IntelligenceOffers({ home = false }: { home?: boolean }) {
  return (
    <section
      className="intelligence-offers"
      id="intelligence"
      aria-labelledby="intelligence-title"
    >
      <div className={home ? "campaign-width" : undefined}>
        <header className="intelligence-heading" data-reveal>
          <h2 id="intelligence-title">
            {home
              ? "Intelligence comes in many forms."
              : "Take your review further."}
          </h2>
          <div>
            <p>
              Make useful intelligence available to everyone. Make deeper
              intelligence affordable. And put human judgement where it makes
              the greatest difference.
            </p>
            {home && (
              <p>
                Different AI models bring different capabilities and costs.
                People bring relationships, experience and the responsibility to
                turn insights into change.
              </p>
            )}
          </div>
        </header>
        <ol className="intelligence-ai" aria-label="AI assessment levels">
          {aiLevels.map((level, index) => (
            <li key={level.name}>
              <div className="intelligence-tier">
                <span>Level 0{index + 1}</span>
                <h3>{level.name}</h3>
              </div>
              <p className="intelligence-price">
                <strong>{level.price}</strong>
                {index > 0 && <span> per assessment</span>}
              </p>
              <p className="intelligence-promise">{level.promise}</p>
              <p>{level.description}</p>
              {index === 0 ? (
                home && (
                  <Link href="/review" className="intelligence-link">
                    Try your first free review <Arrow />
                  </Link>
                )
              ) : (
                <span className="intelligence-status">Coming soon</span>
              )}
            </li>
          ))}
        </ol>

        <div className="intelligence-human">
          <figure>
            <Image
              src="/brand/marcus-warry.jpg"
              width={1122}
              height={1402}
              sizes="(max-width: 720px) 100vw, 35vw"
              alt="Marcus Warry"
            />
            <figcaption>Marcus Warry ACA · My Social Impact</figcaption>
          </figure>
          <div className="intelligence-human-copy">
            <div className="intelligence-tier">
              <span>Level 04</span>
              <h3>Human Intelligence</h3>
              <span className="intelligence-status">Coming soon</span>
            </div>
            <p className="intelligence-human-headline">
              Good intelligence informs. <em>Human intelligence transforms.</em>
            </p>
            <p>
              A conversation gives us room to listen, understand your
              organisation and weigh different perspectives. Together we can
              decide what matters and what you can change.
            </p>
            <p className="intelligence-price">
              <strong>£149</strong> <span>for one framework</span>
            </p>
            <ul>
              <li>An Ultimate AI assessment of your chosen framework</li>
              <li>Professional preparation and review of the AI findings</li>
              <li>A personal 30-minute meeting with Marcus Warry ACA</li>
              <li>
                A short written summary of agreed priorities and next steps
              </li>
            </ul>
            <p className="intelligence-terms">
              This package covers preparation, discussion and agreed priorities.
              Full assurance, an organisational audit and implementation are
              outside its scope.
            </p>
          </div>
        </div>

        <div className="intelligence-explainer">
          <section>
            <h3>Build on what you’ve paid.</h3>
            <p>
              When upgrades launch, eligible payments for the same report and
              framework will count towards the next level. From a £19 Advanced
              assessment, upgrading to £29 Ultimate will cost £10.
            </p>
            <p>
              Your Human Intelligence fee can be credited towards future work
              with My Social Impact. The planned credit covers the qualifying
              amount already paid and is available once on a qualifying project
              commissioned within 60 days.
            </p>
          </section>
          <section>
            <h3>Better intelligence. Shared opportunity.</h3>
            <p>
              We want every organisation to have access to useful intelligence
              about its impact, whatever its size or budget.
            </p>
            <p>
              Our free reviews use efficient AI to make this possible. More
              capable models cost more to run, so we charge a modest amount for
              deeper assessments.
            </p>
            <p>
              When you choose a paid review, you’re also helping us sustain the
              free service for smaller charities, social enterprises and
              organisations working to make a difference.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
