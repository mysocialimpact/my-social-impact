import { PageIntro } from "@/components/shell";
export default function Privacy() {
  return (
    <section className="section">
      <PageIntro
        label="Privacy notice · Version 3.1 · 16 November 2026"
        title="Your report stays yours."
      />
      <div className="content-prose">
        <p>
          My Impact Director is developed by My Social Impact and built by The
          Ideas Shed. Contact{" "}
          <a href="mailto:marcus@mysocialimpact.org">
            marcus@mysocialimpact.org
          </a>{" "}
          for privacy questions, access requests or deletion support.
        </p>
        <h2>What we process and why</h2>
        <p>
          You can upload a report and see headline review results without giving
          us a name or email address. We process the report, extracted content,
          assessment findings and minimal processing records to deliver the
          review. An unguessable browser session protects your access. A report
          may contain information about other people. Only submit documents you
          are entitled to share for this purpose. Remove unnecessary personal or
          sensitive information first.
        </p>
        <p>
          Essential, secure cookies keep guest reviews available in the same
          browser for seven days. Optional email delivery sends a verification
          link valid for 30 minutes. Once you confirm your address, we associate
          it with your report and send the selected detailed assessment when it
          is ready. Delivery uses a background queue with retries. Headline
          snapshots require no email; new full reports require email
          verification. Previously completed combined reviews retain their
          existing access. Opening it gives you a 30-day saved-review session.
          Normal sign-in uses email and password through your shared My Social
          Impact account. We do not store those passwords in this application.
          Existing saved email links remain valid. After you verify ownership of
          an email-link workspace, you can connect it to password login without
          losing reports. Password recovery resets your shared My Social Impact
          password. We do not add advertising trackers or subscribe you to
          marketing.
        </p>
        <p>
          Larger uploads are transferred in private parts to the same protected
          application database. Unfinished uploads expire after one hour and are
          deleted by the scheduled cleanup. Once your review is created,
          temporary parts are removed; your report follows the retention period
          below.
        </p>
        <h2>Document processing and providers</h2>
        <p>
          The application is hosted on Vercel. Report files, extracted text and
          results are kept in a private Neon PostgreSQL database, separate from
          other product databases. The current database region is the United
          States.
        </p>
        <p>
          When you request a review, report content is sent through Vercel AI
          Gateway to OpenAI for extraction and assessment. The application
          requests zero data retention for each assessment call, disables
          response storage and restricts routing to the configured provider. If
          that policy is unavailable, processing fails rather than silently
          relaxing it. These controls do not remove our own retention of your
          saved review.
        </p>
        <p>
          Public report discovery sends the organisation name to an AI
          web-search service. It does not send an uploaded private document to
          web search. Accessible sources are retrieved only after checking
          public-network addresses and website access rules.
        </p>
        <p>
          Where email saving is configured, Resend delivers the requested PDF
          and secure return link to your chosen email address. The PDF then
          follows your email provider’s retention rules. No email is sent unless
          you request it.
        </p>
        <h2>Usage and security</h2>
        <p>
          We count daily totals for review starts, completions, first result
          views, methodology selections, snapshots, email verification and
          delivery, enquiries and feedback. These aggregate counts contain no
          visitor identifiers. To enforce fair-use limits we store keyed,
          rotating hashes of network addresses, never raw network addresses in
          our application rate-limit records. Hosting providers may keep their
          own security logs.
        </p>
        <h2>Who can see your report</h2>
        <p>
          Your uploads and assessments are private to the browser session that
          created them, your existing account, or an email recipient you
          explicitly choose. Knowing a review URL alone does not grant access.
          An email recipient who opens the private saving link can read and
          delete that review. Founder dashboards show operational metadata such
          as account, organisation, status and scores. Detailed quality
          inspection requires your optional consent or your explicit choice to
          share the linked review in a service enquiry. Each inspection records
          an audit reason. Infrastructure administrators may need restricted
          technical access to operate or secure the service.
        </p>
        <h2>Retention and deletion</h2>
        <p>
          Anonymous reports and assessments expire after seven days. Opening an
          optional saving link retains that report for 180 days from that time.
          Reports uploaded through an existing signed-in account expire after
          180 days. Expired reports cannot be accessed; a scheduled worker
          deletes their files and associated records. You can delete them sooner
          from the review page. Deletion also removes extracted pages and
          processing records. An enquiry may remain so the team can complete the
          conversation; deleting its report removes the assessment link.
        </p>
        <p>
          Account, enquiry, feedback and minimal security/audit records are
          retained for service administration. Contact us to request deletion or
          a copy, including closure of the existing shared account. Provider
          backups or recovery history may retain deleted information temporarily
          according to their retention policies; deletion from the active
          application is not a promise of instant removal from every backup.
        </p>
        <h2>Feedback</h2>
        <p>
          Optional feedback is stored in the founder inbox with your rating,
          comment and the page path. You do not need to provide a name or email.
          Feedback does not share your assessment findings or grant access to
          your private report. Please leave out personal or confidential
          information.
        </p>
        <h2>Enquiries and your choices</h2>
        <p>
          When you submit an enquiry, we use the name, email and message you
          provide to respond. Sharing the assessment is a separate choice. We do
          not publish your report or send it to another customer. You can
          request correction, access, deletion or restriction of your data, and
          raise a concern with the relevant data-protection authority.
        </p>
        <h2>Changes</h2>
        <p>
          We retain the privacy notice version accepted with each uploaded
          report. Material changes to processing or sharing will be explained
          before they apply.
        </p>
      </div>
    </section>
  );
}
