# Simple sign-in and Founder Dashboard — release candidate

This phase follows the completed direct OpenAI migration. It does not change models, reasoning, assessments, scoring, digital report design or historical results.

## Implemented

- One sign-in screen for new and returning users: Google, Apple and passwordless email. Account creation occurs after proof, not after a submitted address.
- Existing branded, single-use, 30-minute email-link delivery remains in use. Return destinations are restricted to approved application routes.
- Self-hosted Better Auth 1.7.28 for Google/Apple OAuth. Provider tokens are encrypted, sessions are server-verified, account linking requires verified ownership, and raw IP tracking is disabled. Durable app-specific pseudonymous limits protect sign-in starts without a global visitor allowance.
- Verified email sign-in takes precedence over stale legacy password cookies. Existing owned guest workspaces survive sign-in. Existing password endpoints remain compatible; they are no longer the primary UI.
- Server-approved Founder addresses: marcus@theideasshed.com, marcus@mysocialimpact.org and marcus.warry@gmail.com. These converge only after verified ownership. No submitted name, profile flag or unverified address grants Founder access.
- Explicit, single-use workspace connection proofs preserve reports held under older test logins. Old app aliases are retired after connection; other products' account records are not changed. Founder authority is captured when a connection proof is issued, and other outstanding proofs are invalidated on use. Apple relay emails require an explicitly authorised link from an already verified Founder workspace.
- Optional marketing preferences are separate from sign-in and report delivery.
- `/founder`: Overview, Accounts, Activity, Reviews, Enquiries, Payments and AI Costs. Every data API checks the Founder role. Private report inspection retains the existing owner-consent and audited-reason checks.
- Metrics use canonical account groups. Session counts are labelled as sessions, not unique people. The registered-account funnel is sequential. Contributions distinguish live/test and exclude failed/pending payments from income; refunds remain explicit. Service enquiry conversions are explicitly marked, not invented.
- Model requests, tokens, charged errors, daily estimates, framework costs, document preparation and costs for documents completing all three assessments are available. Missing historical token data is disclosed. USD estimates are not represented as OpenAI invoices.
- `scripts/audit-accounts.ts` defaults to a read-only audit. `--apply` archives only clearly identified tests without financial or enquiry records, expires their sessions and retains accounts, reviews, payments and audit history. Unknown report-bearing accounts remain preserved pending review.

## Current deployment gate

**Not released to production. Google/Apple credentials are not configured. Real provider sign-in and real email delivery through this candidate must pass before promotion.**

Migration `013_signin_founder.sql` has been applied to the existing validation database only:

- Neon project `lucky-sky-23094766`
- Branch `br-calm-queen-aucbc1bk`
- Database `my_impact_director_validation`

Production is `br-bold-fire-au0lio9b` / `my_impact_director`; do not confuse these databases. No production account cleanup or new auth migration has been applied.

A new dedicated `AUTH_SECRET` has been securely created for Preview. No plaintext key belongs in this document, chat, command logs or Git.

## Secure local Mac continuation

Use the user's existing local browser. Apple Developer sign-in is **marcus.warry@gmail.com**, and the user confirmed an existing membership. Do not buy a membership or change any billing plan.

1. Configure Google OAuth and Apple Sign in for **My Impact Director**, using the appropriate existing developer organisations. Inspect existing settings before creating duplicate clients or unrelated app credentials.
2. Register callbacks for both production origins:
   - `https://www.myimpactdirector.com/api/auth/callback/google`
   - `https://myimpactdirector.com/api/auth/callback/google`
   - `https://www.myimpactdirector.com/api/auth/callback/apple`
   - `https://myimpactdirector.com/api/auth/callback/apple`
     Also register the stable preview alias once created; do not use an expiring random deployment URL for registered OAuth.
3. Store `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID` (Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID` and `APPLE_PRIVATE_KEY` (.p8) securely as app-specific Vercel settings. Secret values must never appear in a reply, logs or a committed file. A fresh dedicated Production `AUTH_SECRET` is required; do not copy another app's signing secret. The code generates Apple's short-lived ES256 client secret from the private key.
4. Set `AUTH_PREVIEW_ORIGIN` to the registered stable preview origin. Enable the existing email delivery infrastructure in the validation preview securely, without exposing or replacing the Production email key.
5. Test new/existing Google users, Apple including Hide My Email, email-link delivery/redemption/replay/expiry, standard-user isolation, logout, account linking and preservation of saved reports. Test the founder's actual verified accounts; synthetic fixtures are not evidence of real OAuth success.
6. Inspect fresh desktop and mobile screenshots. `scripts/qa-signin-founder.ts` tests local layouts and DB-backed sections, but intentionally uses visual fixtures for provider buttons. It does **not** claim real OAuth success.
7. Only after these pass: apply the additive migration to the named production database, run the account audit and inspect its targets, apply reversible known-test archiving, deploy this exact candidate, verify the live journey and retain the previous production deployment for rollback. Do not modify models, prompts, methodology, private sharing or report contents.

## Account audit findings before release

Production has 12 registered records at inspection. Five are clearly historical QA identities: the `marcus+mid-qa-*` and `marcus+mid-reset-*` checks, two reserved `example.invalid` UX checks and `qa_direct_openai_production_20261128`. The latter owns one synthetic report; it is preserved by archiving. No registered account has a linked payment or enquiry at this inspection. This is not a claim that every anonymous payment record is absent.

The verified `marcus@mysocialimpact.org` record is preserved. Neither the Ideas Shed address nor the Apple Gmail address has signed in here yet. Addresses such as `test@test.com`, `marcus@test.com` and other ambiguous report-bearing logins are **not** automatically deleted or reclassified as genuine customers. The existing Profit Impact workspace under an ambiguous login must be connected from its owned current session.

## Verification

- 72 unit checks passed; 12 database suites are skipped when no DB test environment is supplied.
- The dedicated sign-in/Founder integration suite passed against the validation database, exercising real persisted sessions, verified ownership resolution, unverified matching-email isolation, canonical restoration, explicit linking, retired aliases, Founder access/isolation, reversible test archiving, all dashboard queries, revenue predicates and logout. Providers were seeded test identities, not live OAuth exchanges.
- The existing legacy password/workspace compatibility suite passed after preserving guest-session adoption and revoking only stale email sessions on an explicit legacy sign-in.
- The contribution ledger integration suite passed with simulated Stripe. No test or live charge was made.
- The application builds. Browser checks and screenshots are stored locally under ignored `artifacts/signin-founder/`.

Existing broader database suites depending on untracked `artifacts/claims-review.json` were not claimed as passing; their fixture must be generated or restored before rerunning those suites.
