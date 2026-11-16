# Creative homepage refinement

## Experience

The homepage has five server-rendered chapters, each present once in the DOM:

1. Navy product introduction: bold identity, developing ambition, Human-led / AI-powered, attribution and a visible first-job invitation.
2. White review studio: the existing uploader beside all three real framework identities and compact native expandable explanations. Mobile puts upload first. One input and one transfer system remain.
3. Orange professional services: exactly three offers — free introductory conversation; improve or digitise an existing report from £500; prepare the next report from £1,000. Scope and larger quotations remain explicit.
4. Light ongoing support: Supported £149, Director £495, Bespoke £1,500 per month; human relationship and judgement, assisted by AI. Frequency, deliverables and senior involvement are agreed, not guaranteed.
5. Navy purpose and people: My Social Impact’s financial-performance vision, genuine Marcus Warry portrait, credentials, email and Somerset / London / Kampala. Existing linked partner signatures remain in the footer.

Desktop chapters use controlled spacing and two-column compositions; no fixed chapter heights or scroll snapping. Expanded content, keyboard focus and zoom can grow naturally. The mobile support prices stack below the name at 380px and narrower to avoid clipping.

The Impact Edit retains its live v2 pillar names and methodology. No assessment prompt, rubric, score, database schema, account, email-delivery or export logic changes.

## Motion

One lightweight client component observes principal headings once. It animates opacity from .65 and a 12px vertical shift for 320ms, then unobserves the element. Content is visible in server HTML, with JavaScript disabled, before intersection and after animation. No animation dependency or sticky/duplicated scene layers.

Native details retain their keyboard behaviour. Supported browsers interpolate open/close height in 220ms; other browsers keep native behaviour. Links have small hover/focus arrow movement. Reduced-motion preference disables motion, including if changed during the session. Important content and the uploader are never delayed or hidden.

## Contact routes

Service CTAs navigate to `/contact?service=<known-service>`. The page uses a strict known-service allowlist and displays the selected interest with a prominent Email Marcus and copy-email action. It does not require an account or form. Contact email subjects contain service context only; no report identifiers, organisation inference or private findings enter URLs.

The optional completed-review checkbox continues to associate interest through the existing ownership-checked endpoint. It grants no findings access. Anonymous clicks remain aggregate-only. Contact-page visits and email actions are intent, never proof an enquiry was received. Founder/privacy wording reflects both contact and email-link clicks. Existing optional in-app enquiry forms remain available.

The primary combined improvement subject is `My Impact Director — Improve or digitise my report`. Existing digitisation service links and historical service keys remain valid. Essentials remains retired.

## Promotion

Rechecked the live https://www.theideasshed.com/project-in-a-day page on 16 November 2026. It still publishes the November 50% £250 starter offer through 30 November, subject to eligibility, code availability, existing weekly limits and no offer combination. The homepage retains an expandable qualification and official live-terms link. The dated offer automatically disappears from 1 December; no availability or full large-report transformation is promised.

## Verification

- Production build / TypeScript; 45 unit checks (database-only suites are skipped in the unit command).
- Four viewport homepage contracts: 1920×1080, 1366×768, 390×844, 320×812. Real branded images, five unique chapters, three report services, three support tiers, all seven service-to-Contact routes, email subjects, copy email, keyboard expansion, navigation and reduced motion.
- Anonymous UI upload transfers the actual fixture bytes through intercepted endpoints, reaches all three review choices and starts the chosen review without registration. No paid model assessment or customer email is triggered.
- Three existing results’ contextual offers retain optional reference linking. Founder intent remains separate from enquiries.
- Existing workspace regression: 105 learning screens, all three assessments, five viewport sizes and incomplete/failed status checks.
- Full-page and individual-chapter screenshots inspected. An initial full-page capture immediately after resizing showed compositor blank regions; fresh contexts and settled per-chapter/full-page captures verify continuous rendering with unchanged section geometry. Element captures hide the sticky header only while taking the crop, preventing the header being stamped across a tall section; full-page and viewport captures retain it.
- Browser contract APIs are intercepted. Existing production workspace, saved reports and historical PDF checks are read-only apart from normal download counters. Production health and deployment-scoped error logs are checked after release.

No new dependency, migration, provider credential, checkout or unsolicited communication.
