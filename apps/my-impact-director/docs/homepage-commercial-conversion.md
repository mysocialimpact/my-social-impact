# Homepage proposition and commercial conversion

The existing orange/navy identity and upload/review journey are preserved. The hero connects the developing AI-and-human Impact Director ambition to its first working job, free impact report review. The first-job statement is a large heading, not an eyebrow. Navigation says “Try your first free review” and focuses the existing homepage uploader; an active review keeps a workspace action. Contact, My Reports and Log in/Account remain.

The homepage still has five main sections: hero/uploader, three reviews with expandable explanations, one-off report services, ongoing support and Marcus. The previous large vision section is consolidated into the hero and a short ambition note. The Impact Edit keeps its live v2 pillar names, rather than reverting to the older list in the brief. No methodology, scoring, extraction or model-prompt changes are included.

## Commercial offer

| One-off service                  | Indicative starting price | Contact subject suffix        |
| -------------------------------- | ------------------------- | ----------------------------- |
| Introductory report conversation | Free, no obligation       | Discuss my impact report      |
| Improve an existing report       | £500                      | Improve my existing report    |
| Digital report starter           | £500                      | Digitise my impact report     |
| Prepare the next report          | £1,000                    | Prepare my next impact report |

Every subject starts `My Impact Director —`. All links address `marcus@mysocialimpact.org`; no report ID or contents enter an email URL. One-off scope, larger-work quotes and limitations are stated beside the offers. Existing optional in-app enquiries remain available without registration; direct email is the first route. Marcus’s genuine portrait, credentials, locations and both linked partner signatures remain. Copy-email gives a manual-address fallback if clipboard access is unavailable.

Monthly support has three levels: Supported from £149, Director from £495 and Bespoke from £1,500. Check-in frequency, deliverables, senior/board involvement and scope are agreed before engagement. No unlimited entitlements, fixed meeting durations, salary-replacement claim or subscription checkout is added. Essentials is retired: no public price or new enquiry acceptance; historical records and labels remain available to founders.

### Verified Ideas Shed offer

Checked 16 November 2026 against the live [Project in a Day page](https://www.theideasshed.com/project-in-a-day) and [homepage](https://www.theideasshed.com/). The £500 standard agreed day project has an eligible £250 November offer through 30 November 2026, subject to eligibility and code availability. Charity/B Corp/social-enterprise categories retain three half-price places each per week, released Sundays at noon UK time. Offers cannot be combined. Our page promises no available slot and directs visitors to the live terms/availability check. No booking or payment is made by this change.

The dated £250 promotion is removed automatically from 1 December UK time. The standard starting price and a link to current provider offers remain. A one-day starter is explicitly limited in scope; full bespoke digitisation is not promised.

## Contact intent, enquiries and privacy

`POST /api/service-intents` accepts strict, same-origin metadata only. Its separate network throttle cannot consume a free-review allowance. A failed tracking request never blocks an email link.

| Event                            | Meaning                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `service_cta_click`              | A direct contact link was selected; not proof an email was sent                     |
| `service_interest_<service>`     | Interest in the selected one-off service or support tier                            |
| `browser_session_started`        | First counted page in a browser tab session                                         |
| `returning_browser_session`      | An approximate return based on a local visited flag, not a unique-person identifier |
| Existing `enquiry_created`       | An enquiry was actually saved through the application-controlled form               |
| Existing `full_report_delivered` | Report accepted by the email service, not proof of receipt/read                     |

Anonymous contact clicks are aggregate only. Verified signed-in account interest uses the existing audit store for founder follow-up. Linking a completed, owned and accessible review requires an explicit checkbox. It records a reference only: no access to findings is granted, no private document text is stored in the intent and no mailto includes it. Existing founder inspection still requires the owner’s separate sharing consent plus an audit reason.

The founder dashboard separates account-linked intent from received enquiries, exposes per-service interest and approximate repeat-session totals, and keeps existing upload/account/review/delivery metrics. Confirmed paid clients and revenue are explicitly “not recorded”; clicks are never converted into invented revenue. Existing enquiry follow-up statuses are retained. The privacy notice explains the new behaviour. No new table, migration, dependency, provider credential or CRM is required.

## Verification

- Production build and TypeScript checks.
- 44 unit checks plus the real validation-database suite, including contact-intent privacy, explicit review linking, incomplete/unknown review rejection, strict request fields, same-origin enforcement and no model/email calls.
- Historical Essentials enquiries remain visible while new retired-package submissions are rejected.
- Homepage at 1440×900, 1366×768, 390×844 and 320×812: first-job heading starts within the first screen; working uploader shortcut/file selection; accurate prices, promotion qualifications, mobile navigation, genuine image loads, correct email subjects, copy-email and no horizontal overflow.
- All three completed-review commercial invitations and opt-in linking; founder intent display without private findings access.
- Existing 105 educational screens and historical/current Impact Edit result contracts.
- Axe checks find no WCAG A/AA violations in the four homepage layouts. Screenshots are inspected; these checks are not an independent accessibility certification.

Scripts: `npm test`, `npm run test:database`, `node scripts/qa-commercial.mjs <base-url>`, `node scripts/qa-workspace.mjs <base-url>` and `node scripts/qa-impact-edit-v2.mjs <base-url>`. Browser contracts intercept APIs and do not submit real customer enquiries, trigger model assessments or send emails. Live existing-workspace/PDF checks and deployment-scoped error logs are verified after production release and recorded in the pull request.

A real email can only be confirmed after the visitor sends it from their own email application. Best-effort intent counts and browser return flags can be incomplete; they are labelled accordingly. No claim of new clients or revenue is made.
