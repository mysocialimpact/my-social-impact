import { PageIntro } from "@/components/shell";
export default function Terms() {
  return (
    <section className="section">
      <PageIntro
        label="Using My Impact Director"
        title="Useful insight. Clear limits."
      />
      <div className="content-prose">
        <h2>A starting point for improvement</h2>
        <p>
          The free review is an automated assessment of information presented in
          a report. It is not an audit, certification, assurance opinion, legal
          advice or verification of actual social impact. Check source passages
          and apply your own judgement before relying on a finding or
          communicating a score.
        </p>
        <h2>Your responsibilities</h2>
        <p>
          Submit only reports you have permission to share and process. Do not
          upload malicious, unlawful or unnecessary sensitive content. You
          retain rights in your report and allow us to process it to provide the
          requested service. Keep your private browser session and optional
          email links secure.
        </p>
        <h2>Free use and availability</h2>
        <p>
          Create a free account or log in to start a new review. The current
          fair-use limit is three reports per account per 24 hours, with
          additional network limits for anonymous use, with 20 stored reports.
          PDFs may be up to 50 MB and 100 pages; unusually complex or lengthy
          content may exceed processing limits. Searches and retries also have
          fair-use limits. We may pause processing when capacity or safety
          checks require it. We do not invent results for failed jobs.
        </p>
        <h2>Professional services</h2>
        <p>
          Professional reviews, report preparation and digitisation are separate
          services offered by My Social Impact. Scope, price and terms are
          agreed through a conversation. An enquiry creates no purchase
          commitment.
        </p>
        <h2>Voluntary support</h2>
        <p>
          Any contribution is entirely optional, one-off and in pounds sterling.
          The receiving merchant and amount are shown before you confirm payment
          through Stripe. Contributions do not purchase a review, change its
          findings, or grant preferential access. Your reviews remain free
          whether you contribute or not. This is social enterprise support, not
          a tax-deductible charitable donation; Gift Aid is not offered. For a
          payment question or refund request, contact marcus@mysocialimpact.org
          with your Stripe reference. Do not send card details.
        </p>
        <h2>Accessibility</h2>
        <p>
          We aim for WCAG 2.2 AA: readable contrast, responsive layouts,
          keyboard access, visible focus states, semantic controls and
          reduced-motion support. We have not claimed independent accessibility
          certification. If you encounter a barrier or need an alternative
          format, contact{" "}
          <a href="mailto:marcus@mysocialimpact.org">
            marcus@mysocialimpact.org
          </a>
          .
        </p>
        <h2>Questions and corrections</h2>
        <p>
          If a finding is inaccurate, please tell us which report, criterion and
          source page are involved. We welcome corrections and use professional
          feedback to improve future methodology versions.
        </p>
      </div>
    </section>
  );
}
