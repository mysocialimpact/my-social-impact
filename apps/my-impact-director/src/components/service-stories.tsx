import Link from "next/link";
import { Arrow } from "./icons";
export function ServiceStories() {
  const offers = [
    {
      slug: "expert-review",
      label: "Expert Impact Report Review",
      title: (
        <>
          A little perspective.
          <br />
          <em>A big difference.</em>
        </>
      ),
      copy: "Go beyond the automated review. Work through the evidence, the difficult questions and your next steps with an experienced impact professional.",
      cta: "Talk through your report",
      note: "EXPERT EYES. PRACTICAL ADVICE.",
    },
    {
      slug: "preparation",
      label: "Create an Impact Report",
      title: (
        <>
          You’re making a difference.
          <br />
          <em>Let’s show it.</em>
        </>
      ),
      copy: "From gathering evidence to finding the story that matters. Create a credible, compelling impact report that does your organisation’s work justice.",
      cta: "Create your impact report",
      note: "FROM EVIDENCE TO A STRONGER STORY.",
    },
    {
      slug: "digitisation",
      label: "Digitise Your Impact Report",
      title: (
        <>
          Great impact deserves
          <br />
          <em>to be explored.</em>
        </>
      ),
      copy: "Take your report beyond the PDF. Give people an engaging, accessible digital experience, with your evidence and stories at their fingertips.",
      cta: "Bring your report to life",
      note: "A REPORT PEOPLE CAN GET INTO.",
    },
  ];
  return (
    <div className="service-stories">
      {offers.map((s, i) => (
        <article className={"service-story story-" + i} key={s.slug}>
          <div className="story-art" aria-hidden="true">
            {i === 0 ? (
              <div className="annotated-report">
                <span>IMPACT REPORT / REVIEW NOTES</span>
                <div className="report-lines" />
                <div className="annotation">
                  What changed?
                  <br />
                  <em>Show the evidence.</em>
                </div>
                <div className="report-lines short" />
                <b>Clarity changes everything.</b>
              </div>
            ) : i === 1 ? (
              <div className="story-steps">
                <span>
                  01 <b>Understand</b>
                </span>
                <span>
                  02 <b>Evidence</b>
                </span>
                <span>
                  03 <b>Your story.</b>
                </span>
              </div>
            ) : (
              <div className="digital-report">
                <span>YOUR IMPACT, EXPLORABLE.</span>
                <div className="digital-tabs">
                  People &nbsp; / &nbsp; Progress &nbsp; / &nbsp; Possibility
                </div>
                <strong>
                  There’s a story
                  <br />
                  behind every
                  <br />
                  <em>number.</em>
                </strong>
                <span className="digital-cursor">
                  <Arrow />
                </span>
              </div>
            )}
            <small>{s.note}</small>
          </div>
          <div className="story-copy">
            <p className="eyebrow">
              0{i + 1} / {s.label}
            </p>
            <h3>{s.title}</h3>
            <p>{s.copy}</p>
            <Link href={"/services/" + s.slug} className="text-link">
              {s.cta}
              <Arrow diagonal />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
