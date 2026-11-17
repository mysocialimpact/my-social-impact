import Link from "next/link";
import { CreativeCaveat } from "@/components/creative-caveat";
import {
  REPORT_VERSION,
  REPORT_SCORING,
  reportPillars,
  reportWeights,
  reportV2Criteria,
  reportV2Anchors,
} from "@/lib/report-methodology";
export const metadata = {
  title: "The Impact Edit Methodology v2.0 — revised beta",
};
export default function Methodology() {
  return (
    <section className="section content-prose">
      <p className="eyebrow">MY SOCIAL IMPACT · METHODOLOGY {REPORT_VERSION}</p>
      <h1>The Impact Edit Methodology v2.0 — revised beta</h1>
      <p className="methodology-question">
        Does your impact report make an impact?
      </p>
      <CreativeCaveat />
      <p>
        An editorial and visual review of how a report communicates. We judge
        execution, not the presence of headings, charts, photographs or
        consistent colours. This does not verify underlying impact claims or
        organisational maturity.
      </p>
      <h2 id="visual-inspection">Actual pages. Specific evidence.</h2>
      <p>
        We render every page of reports up to 30 pages at 1,600 pixels wide.
        Longer reports use beginning, middle and ending pages plus targeted
        data, risk, table and human-example pages. Scoring calls receive actual
        page images as well as page-specific observations and source text. The
        results disclose the inspected pages. Unseen pages are not verified.
      </p>
      <p>
        Physical text size and sampled PDF structure supplement visual
        judgement. We distinguish visible contrast, magnified inspection, tags
        and text alternatives from untested screen-reader behaviour, reflow and
        measured contrast ratios. Untested assistive usability is unassessable.
        Missing visual evidence is an assessment limitation: it does not become
        a low design score or a confident overall score.
      </p>
      <h2 id="scoring">
        Five weighted pillars. Twenty-five anchored criteria.
      </h2>
      <p>{REPORT_SCORING}</p>
      <ol start={0}>
        {reportV2Anchors.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ol>
      <p>
        A contents page or chart never earns a strong score merely by existing.
        Each criterion explains the execution, relevant physical pages,
        strengths, weaknesses, chosen anchor and practical improvement. We avoid
        double-counting: physical body-text legibility belongs to Readability,
        typographic craft and contrast to Visual Design, and data-label
        readability to Data Presentation.
      </p>
      <h2 id="criteria">The locked rubric</h2>
      {reportPillars.map((pillar, i) => (
        <section key={pillar}>
          <h2>
            {pillar} · {reportWeights[i]} points
          </h2>
          {reportV2Criteria.slice(i * 5, i * 5 + 5).map((c) => (
            <details key={c.id}>
              <summary>{c.question}</summary>
              <ol start={0}>
                {c.anchors.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </details>
          ))}
        </section>
      ))}
      <h2>Read first. Score second. Check the judgement.</h2>
      <p>
        Before criterion scoring we record an AI-simulated first impression and
        a five-question scan: purpose, difference made, achievements, challenges
        and next steps. We examine copy load, repeated layouts, visual relief
        and the integration of images, stories and data. Scoring receives that
        reading evidence without a target total. After scoring, editorial
        quality control checks for inconsistency; unresolved conflicts withhold
        the overall score rather than change the number arbitrarily.
      </p>
      <p>
        Legibility, contrast, navigation and visual accessibility inform the
        relevant pillars. Material concerns are disclosed separately. No claim
        of technical PDF accessibility compliance is made.
      </p>
      <h2 id="reader-test">The whole-report reader test</h2>
      <p>
        Could a new reader identify the main outcomes, their scale, limitations
        and next steps in about two minutes? We simulate that scan, record where
        each answer can be found and distinguish easy access from effort or an
        unanswered question. This is not a timed user test. The final editorial
        verdict considers whether the whole publication holds attention and
        checks that the numerical result matches the reading experience.
        Engagement is not a sixth numerical pillar.
      </p>
      <h2 id="limitations">Proportionality, judgement and versions</h2>
      <p>
        A short, simple or black-and-white report can be excellent. We do not
        require expensive photography, decorative graphics, elaborate contents
        or interactive features. Candour and authentic experience matter. Visual
        and editorial judgement remains indicative, and independent professional
        calibration is not claimed.
      </p>
      <p>
        Revised v2.0 is stored as version 2.0.1 to distinguish it from the
        earlier, differently weighted 2.0.0 rubric. This is a beta assessment
        without independent human calibration. Previous results retain their
        original scores and methodology.{" "}
        <Link href="/methodology/impact-report-excellence/v1">
          Read the archived v1 methodology.
        </Link>
      </p>
      <p>
        <Link href="/methodology/impact-report-excellence/v2-0-0">
          Read the archived v2.0.0 methodology.
        </Link>
      </p>
      <Link href="/review" className="button primary">
        Upload a report →
      </Link>
    </section>
  );
}
