# Password accounts and personal workspaces

## Product behaviour

Visitors can upload a PDF, choose Claims Code, Social Impact Excellence or The Impact Edit, and view a headline snapshot anonymously. The upload and methodology picker disclose that a free verified account saves work and unlocks detailed criteria, downloads and sharing. Registration asks only for email and password, plus an optional unticked news preference. Users can register while the durable job continues.

`/register`, `/login`, `/forgot-password`, `/verify-email` and `/account` reuse the established My Social Impact account service at `ACCOUNT_ORIGIN/api/readiness-account`. Password hashing, credential checking, reset tokens and password sessions stay at that service. This app stores no passwords and introduces no authentication service or subscription. Password reset emails open the existing secure My Social Impact/SORP reset page; users return here to log in. The API also supports the provider's reset action for contract verification.

## Ownership and compatibility

A provider subject is provisionally represented by its existing `director.users` row. `account_email`, `canonical_owner_id` and `password_verified_at` bind that subject to a canonical workspace only after explicit email ownership proof. Matching email text does not grant access. A browser that possesses both a current verified-email session and the matching password session can link them directly. The identity provider remains the authority for founder privileges.

Verification captures both the provider subject and the authenticated guest session before issuing an expiring link. It grants only the owned/captured documents, preserves historical reports, extends saved retention and subscribes selected assessments for completion delivery. Reports uploaded by an unverified password account are retained through verification as well. Existing magic-link sessions and links remain usable. Establishing a password with the same verified email reuses the canonical account; duplicate provider placeholders never duplicate the registered workspace. Subsequent password logins reuse the persisted verification and do not send new verification emails. Account confirmation screens refresh pending verification when it completes in another tab.

Migration 008 adds columns and indexes to existing private users and email-links tables. It requires no new runtime permissions and is compatible with the previous release. Consent history uses the existing protected audit table. Production migration must be applied before deploying the new code; application rollback can retain the additive columns.

## Sharing and news preferences

Completed assessments remain private until a verified owner explicitly generates a random 256-bit share link. Only its SHA-256 hash is stored. Links live in the URL fragment, expire after 30 days, are revocable, and cannot establish account sessions. Shared responses expose only the detailed assessment and document title; original PDF bytes, private processing records and account data are excluded. Pages and responses specify no indexing and no caching. Anyone holding a link can read and retain its assessment, which is disclosed at creation.

Marketing choice, time, wording/version and source are stored on the canonical user and in audit events. Account settings provide unsubscribe. Declining or withdrawing marketing leaves transactional account and assessment emails active. This release sends no marketing campaigns. Founder administration distinguishes actual registrations, confirmed email, preferences, share counts, document organisations, assessment progress, report emails and enquiries.

## Verification evidence

- 31 unit checks and 31 real validation-database checks pass. Database identity, AI and email transports are mocked; real transactions, ownership, token isolation/replay, report migration, PDF bytes, queue idempotency, preferences, shares and revocation are exercised.
- The new account regression includes unverified-email collision denial, registration during an existing guest review, adoption of an upload made by a pending password account, reuse of an existing verified-email account, password login from another browser, reset forwarding, automatic PDF transport and a durable password-login URL, unsubscribe, and rejection of a share token as an account verification token.
- The account browser contract covers registration, login, logged-out reports, authenticated workspace, confirmation, saved results and active processing at 1440×900, 1366×768 and 390×844. It uses synthetic HTTP transports; it is not evidence of real inbox delivery or identity-provider authentication. Screenshots and exact results are in ignored `artifacts/accounts`.
- Build and TypeScript pass. Real deployed authentication and received-email results are recorded separately after release. Do not represent mocked email acceptance as live inbox delivery.

The validation database retains four unused prototype tables from an earlier implementation attempt. Runtime roles have no access to those tables; the final implementation does not use or create them in production. No permission-expanding grant was applied.
