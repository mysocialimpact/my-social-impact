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
  title: "The Impact Design Review Methodology v2.0 — revised beta",
};
export default function Methodology() {
  return (
    <section className="section content-prose">
      <p className="eyebrow">MY SOCIAL IMPACT · METHODOLOGY {REPORT_VERSION}</p>
      <h1>The Impact Design Review Methodology v2.0 — revised beta</h1>
      <p className="methodology-question">
        Does your impact report make an impact?
      </p>
      <CreativeCaveat />
      <aside className="notice">
        <strong>Indicative creative scoring.</strong>
        <p>
          The new visual art-director engine has been compared on real reports
          and controlled examples, but has not been independently calibrated by
          human publication designers. We publish the beta evidence and
          recommendations, with experimental criterion and pillar estimates,
          with an overall number when coverage, inspection and consistency
          checks pass. Independent editorial calibration is still needed.
        </p>
      </aside>
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
        Rendered pages support judgement of typography, composition, colour and
        visible contrast. They cannot establish screen-reader behaviour, PDF
        tagging, reflow or measured contrast ratios. Untested technical
        accessibility is not treated as verified. Missing visual evidence is an
        assessment limitation: it does not become a low design score or a
        confident overall score.
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
        A capable multimodal AI first examines the actual pages and forms a
        candid art-director opinion about readability, hierarchy, design,
        storytelling and data communication. It receives no previous scores or
        numerical rubric in this first pass. A second pass applies the anchored
        criteria to that reading and the source pages. Application code
        calculates the weighted totals. A final consistency review re-examines
        relevant pages and corrects unsupported criterion judgements. It cannot
        impose an arbitrary total. Unresolved conflicts are disclosed.
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
        The art-director engine is stored as version 2.1.0, retaining the
        revised v2.0 weighting of 25/30/25/10/10. It records the document hash,
        model configuration, prompt version, evidence, recommendations and
        completion date. Refreshing or returning displays the saved assessment
        without regenerating it. A new version requires an explicit
        reassessment; previous results keep their original scores and
        methodology.{" "}
        <Link href="/methodology/impact-report-excellence/v1">
          Read the archived v1 methodology.
        </Link>
      </p>
      <p>
        <Link href="/methodology/impact-report-excellence/v2-0-0">
          Read the archived v2.0.0 methodology.
        </Link>
        {" · "}
        <Link href="/methodology/impact-report-excellence/v2-0-1">
          Read the archived 2.0.1 engine.
        </Link>
      </p>
      <Link href="/review" className="button primary">
        Upload a report →
      </Link>
    </section>
  );
}
