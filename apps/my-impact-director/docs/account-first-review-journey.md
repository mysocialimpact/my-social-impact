# Account first, remembered email, and visible review preparation

New uploads, published-report retrieval, new framework assessments and retries now require a signed-in account. The existing shared My Social Impact email/password service and verified email-link accounts remain supported. No new identity provider, schema, password store or migration is introduced. HTTP guards run before processing and allowance consumption; existing guest-owned results and saved email links remain readable under existing access checks.

The homepage uploader initially presents an inline free-account form with a returning-login option. Successful authentication reveals the existing uploader in place. Email survives switching between signup and login. The header action focuses the account email field until the uploader becomes available. Account refreshes on sign-in and window focus preserve the current controls and selected PDF, avoiding file-dialog focus races.

Known account emails appear as text, not a second email input, in both workspace saving and report delivery. Email confirmation remains necessary before emailing detailed results or connecting legacy workspaces: knowing or entering an email address alone never proves ownership. Verified accounts bypass further verification. A verification request uses the authenticated address; it sends no unsolicited marketing. Existing guest recovery can still ask for an address because those sessions have no authenticated email.

Every framework’s first learning screen explains that the review is being prepared in the background while the visitor explores how its score is made. Its framework-specific purpose, five pillars, simple assessment outline and Explore the five pillars action replace the large email form. Account identity is shown without asking for it again. Completed and failed reviews get accurate introductory wording. The bottom review action opens the methodology while processing, rather than prompting for email again.

The tracker’s true queued/running state has a green panel, green text and a pulsing dot. Not-started entries have grey text and a hollow dot. Completed entries are static green; failures are marked Needs attention. Text accompanies every state. The pulse is disabled for reduced motion. The existing API polling supplies state; learning-page numbers never claim to represent processing percentages.

Verification:

- Production build and TypeScript; 46 unit checks.
- 25 validation-database checks, including password signup/login, verification reuse, ownership isolation and every new processing guard. Guest upload rejection does not consume allowance; a newly signed-in unverified account can begin upload. Existing allowance/network/abandoned-upload regression tests remain.
- Dedicated browser journey at 1519×915, 1366×768, 390×844 and 320×812: new signup, mode switching preserves email, returning login and destination, upload bytes transferred, assessment selection, three preparing introductions, state changes, remembered delivery email, verified account state, reduced motion and accessibility.
- Existing 105 learning screens and homepage/commercial regression checks.
- Browser tests intercept account/model/email transports, so they create no production accounts, paid assessments or customer emails. Database tests use the dedicated validation database and synthetic external transports, and clean up their own data.
- Production smoke tests check actual unauthenticated API rejection, existing authenticated workspace/PDF access, health and deployment-scoped error logs. New real paid assessments are not part of this release verification.
