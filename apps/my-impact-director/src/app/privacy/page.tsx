import { PageIntro } from "@/components/shell";
export default function Privacy() {
  return (
    <section className="section">
      <PageIntro
        label="Privacy notice · Version 1.0 · 15 November 2026"
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
          We process your account identifier, name and email, the reports you
          submit, extracted content, assessment findings and processing records
          to deliver and save your reviews. A report may contain information
          about other people. Only submit documents you are entitled to share
          for this purpose. Remove unnecessary personal or sensitive information
          first.
        </p>
        <p>
          Accounts use the existing My Social Impact / SORP authentication
          service. Existing account details remain with that service. My Impact
          Director does not store your password. Essential, secure session
          cookies keep you signed in. We do not add advertising trackers or
          automatically subscribe you to marketing.
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
        <h2>Who can see your report</h2>
        <p>
          Your uploads and assessments are private to your account. Other users
          cannot view them. Founder dashboards show operational metadata such as
          account, organisation, status and scores. Detailed quality inspection
          requires your optional consent or your explicit choice to share the
          linked review in a service enquiry. Each inspection records an audit
          reason. Infrastructure administrators may need restricted technical
          access to operate or secure the service.
        </p>
        <h2>Retention and deletion</h2>
        <p>
          Reports and their associated assessments are scheduled for automatic
          deletion 180 days after upload. You can delete them sooner from the
          review page. Deletion also removes extracted pages and processing
          records. An enquiry may remain so the team can complete the
          conversation; deleting its report removes the assessment link.
        </p>
        <p>
          Account, enquiry and minimal security/audit records are retained for
          service administration. Contact us to request deletion or a copy,
          including closure of the existing shared account. Provider backups or
          recovery history may retain deleted information temporarily according
          to their retention policies; deletion from the active application is
          not a promise of instant removal from every backup.
        </p>
        <h2>Enquiries and your choices</h2>
        <p>
          When you submit an enquiry, we use its message and your account email
          to respond. Sharing the assessment is a separate choice. We do not
          publish your report or send it to another customer. You can request
          correction, access, deletion or restriction of your data, and raise a
          concern with the relevant data-protection authority.
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
