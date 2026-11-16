import Image from "next/image";
import Link from "next/link";
import { rubrics, reportAnchors } from "@/lib/rubric";
import { reportGuidance } from "@/lib/report-guidance";
export const metadata = {
  title: "Impact Report Excellence Methodology — Version 1.0",
};
export default function Methodology() {
  return (
    <section className="section content-prose">
      <Image
        src="/brand/impact-report-excellence-horizontal.svg"
        alt="Impact Report Excellence"
        style={{ maxWidth: "100%", height: "auto" }}
        width={480}
        height={120}
      />
      <p className="eyebrow">MY SOCIAL IMPACT · METHODOLOGY VERSION 1.0</p>
      <h1>Does your impact report make an impact?</h1>
      <p>
        Our editorial and creative assessment examines clarity, storytelling,
        design, engagement and communication. It measures how the report
        communicates, rather than verifying its impact claims or establishing
        organisational maturity.{" "}
        <Link href="/methodology">Compare all three methodologies.</Link>
      </p>
      <h2>How we inspect your report</h2>
      <p>
        We reuse the extracted text and shared document understanding. A
        separate visual pass renders actual PDF pages at 1,600 pixels wide.
        Reports up to twelve pages are inspected throughout; longer reports use
        the cover, opening, ending, evenly spaced pages and targeted contents,
        case-study and data pages. The report lists the physical pages
        inspected. Unseen pages are not verified. Source text supports writing
        observations; inspected images support design observations.
      </p>
      <h2>Five pillars. Twenty-five criteria. One hundred points.</h2>
      <p>
        Each criterion scores 0–4. Five equally weighted pillars contribute up
        to twenty points each. Fully assessable scores are added directly. When
        a criterion is genuinely inapplicable or unassessable, its pillar
        normalises the remaining scores to twenty. A definitive indicative score
        requires at least four assessable criteria in every pillar and
        twenty-two overall, plus actual visual inspection. Otherwise we show a
        provisional review without an overall score.
      </p>
      <ol start={0}>
        {reportAnchors.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ol>
      {rubrics.report.map(([pillar, ...tests]) => (
        <section key={pillar}>
          <h2>{pillar}</h2>
          {tests.map((test) => {
            const guidance =
              reportGuidance[
                test.split(" · ")[0] as keyof typeof reportGuidance
              ];
            return (
              <details key={test}>
                <summary>{test}</summary>
                <div style={{ whiteSpace: "pre-line" }}>
                  {guidance.guidance.replaceAll("**", "")}
                </div>
              </details>
            );
          })}
        </section>
      ))}
      <h2>Judgement, proportionality and limits</h2>
      <p>
        A modest report can communicate brilliantly. We do not require expensive
        imagery, interactive PDFs or inappropriate personal stories. Ethical
        representation and audience needs matter. Missing visual information,
        unreadable pages and sampling limits must be disclosed, not treated as
        defects in the organisation.
      </p>
      <p>
        AI produces page-referenced observations and practical recommendations.
        Application code validates criterion identities, citations and score
        aggregation. Creative judgement is subjective and can vary. This is a
        new framework developed by My Social Impact, not an independently
        validated standard, certification or accreditation. Professional human
        calibration is ongoing; automated tests establish software behaviour,
        not methodological validity.
      </p>
      <p>
        Recommendations identify what to change, why, where and how, with
        priorities and a suggested creative direction grounded in the assessed
        document.
      </p>
      <Link href="/#upload" className="button primary">
        Start your free review →
      </Link>
    </section>
  );
}
