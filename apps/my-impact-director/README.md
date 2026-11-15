# My Impact Director

Evidence-grounded reviews of impact reports against the Social Impact Claims Code and Social Impact Excellence frameworks. This is a standalone Next.js application in the `my-social-impact` repository; the parent website has a separate deployment. Its TypeScript and ESLint configurations narrowly exclude this independent app. Existing website runtime code and deployment settings are unchanged.

## Campaign redesign

The current redesign leads with the product and its first free job: a navy product identity beside an electric-orange report-upload area. The homepage has four sections, with established framework logos, concise professional offers, one purpose statement and a compact branded footer. The opening includes a native file-picker shortcut on mobile. Top navigation and a measured, permanent bottom bar remain accessible; the bar follows real review progress and changes to saving/expert help when results are ready. It reserves its own space on every viewport.

`/feedback` accepts anonymous ratings and comments without collecting contact details or sharing report findings. `/api/feedback` validates the origin, browser identity, rating and local page path, enforces fair-use limits, and stores messages in the existing founder enquiry inbox. Founders can search and manage feedback there. No database migration is required for this redesign. `scripts/campaign-pixels.mjs` captures laptop, large desktop and phone views; `campaign-qa.mjs` checks the first-screen action, native picker, responsive menus, fixed controls, footer clearance and feedback retry behavior. Browser transport mocks are explicitly labelled; deployed persistence and real assessments are checked separately.

## Release status

The product-first navy/orange campaign redesign is live at **https://www.myimpactdirector.com**, with a permanent apex-to-www redirect. Anonymous uploads are enabled. A fresh public-site review of a real 17-page charity report completed all 40 tests, both framework scores, source navigation, a complete branded PDF and browser-session return access without registration. Production cron resumed processing automatically after the initial request ended. Deployment: `dpl_FHqPQKDvZ1CyfkEe1rBZN1RXGzj6`, application commit `0fd6219` (15 November 2026).

Email saving is implemented and contract-tested, but remains disabled because this project has no Resend credential or verified sender. The Vercel connector refused integration configuration access with 403, the Vercel CLI is unavailable, the browser connection failed, and no Resend connector was found. The user has authorised email setup; the missing dependency is working credential access, not further permission. Add `RESEND_API_KEY` and verified `EMAIL_FROM` securely for this project, supply a test recipient, and verify delivery before setting `EMAIL_ENABLED=true`.

Broader model calibration is incomplete. The ten authored fixtures remain in the isolated validation database; repeated provider HTTP 429 responses throttled the bulk run. Drivers are paused. Resume the serial `drive-calibration.ts` runner once capacity is available and review its results against `humanReviewCheck`. The real production journey passed, but neither that nor engineering tests establish professional methodology validation. Repeated live runs of the same public report produced Claims Code scores of 57.5 and 47.5, and Excellence scores of 65 and 61.25. This observed model-judgement variation reinforces the need for human calibration before treating the indicative scores as professionally validated. The redesign preserves the existing scoring engine; it does not tune the rubric to one example.

## Architecture

- Next.js App Router, TypeScript, accessible responsive React components and locally served fonts.
- Anonymous reviews use random 256-bit HttpOnly browser-session tokens, stored only as SHA-256 hashes. Optional saving uses single-use, 30-minute email links and 30-day saved-review sessions. Existing My Social Impact accounts and server-verified founder access remain supported at `/api/readiness-account`; no new passwords are stored.
- A private `director` schema in a dedicated Neon database. Runtime credentials have access to this schema without database administration privileges. Original PDFs are private database objects, never public URLs.
- Durable PostgreSQL job stages, row locks, expiring leases, fencing tokens, persisted checkpoints, bounded retries and a protected scheduled worker. Requests initiate processing with Next.js `after`; production cron resumes work after interruptions.
- Vercel AI Gateway with project OIDC authentication, OpenAI-only routing and zero data retention requested for document assessment. The deployed model is `openai/gpt-5.4-nano`; `gpt-5.4-mini` was unavailable on the Gateway free tier. The approved direct OpenAI key request was rejected by OpenAI Platform, so no direct key was saved and no billing plan changed. Provider 429 responses trigger shared backoff and do not consume a validation retry; total processing attempts remain bounded.
- Strict Zod intermediate schemas; deterministic score calculations; source quote/page validation before publishing; model-selected passage IDs resolve to exact source text, preventing copied-quotation drift; separate material claim analysis. No model-generated aggregate scores are accepted.
- Service enquiries are stored for the founder, without sending emails. Inspection of report details requires owner sharing consent and a recorded purpose.

`src/lib/rubric.ts` owns the versioned 40-test methodology. `assessment.ts` validates evidence and calculates scores. `pipeline.ts` orchestrates extraction, visual interpretation, context, claims, ten principle assessments and recommendations. `public-fetch.ts` protects report retrieval against private addresses, DNS rebinding, redirects to restricted networks, oversized downloads and robots restrictions.

## Configuration and development

Use Node.js 24 and `npm ci`. Copy `.env.example` to a private `.env.local`; never commit credentials. Required server configuration:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Restricted runtime connection for this application and environment |
| `ACCOUNT_ORIGIN` | Existing account service origin |
| `APP_ORIGIN` | Exact application origin; deployment URL is also accepted for CSRF checks |
| `AI_MODEL` | Gateway model ID; update pricing assumptions when changing it |
| `CRON_SECRET` | Strong worker authentication secret and report-selection signing key |
| `REVIEWS_ENABLED` | Defaults off; enable only after live validation |
| `AI_GATEWAY_API_KEY` | Optional server-only local alternative to deployment OIDC |
| `EMAIL_ENABLED` | Enable only with a verified sender and successful live delivery check |
| `RESEND_API_KEY` | Server-only application email credential |
| `EMAIL_FROM` | Verified sender address accepted by Resend |

Run both migrations in filename order using a database owner connection, then grant the restricted runtime role SELECT, INSERT, UPDATE and DELETE on the four new tables: `access_sessions`, `email_links`, `review_grants` and `daily_metrics`. Migration 002 is additive and preserves existing reports and accounts. Then switch to the restricted runtime connection. Never grant runtime migrations or administrative roles. `npm run dev` starts the app; `npm run build` creates the production build. In a nested checkout the app’s `postcss.config.mjs` deliberately avoids inheriting parent Tailwind configuration.

## Verification

```sh
npm run typecheck
npm test
npm run test:database
npm run build
QA_BASE_URL=https://your-preview.vercel.app npm run test:browser
npm run fixtures
```

Database integration tests require exactly `my_impact_director_validation` and clean up their synthetic accounts and reports. They exercise real database transactions and PDF handling with mocked identity/model transports: these are application contract tests, **not genuine AI assessments**. Synthetic exports are clearly testing artifacts in the ignored `artifacts` directory.

Browser checks use Playwright and axe on public pages and unauthenticated screens at desktop and phone widths. The separate `scripts/qa-results.mjs` checks completed results, all 40 findings, source navigation, download, saved reviews and enquiry consent using intercepted test-browser responses from the integration fixture. It never writes fixture data to the deployed app and is not a genuine deployed assessment. Install its Chromium browser, or set `QA_BROWSER` to an available executable. An expiring Vercel share token may be supplied through `QA_BYPASS`, or a private configuration JSON file passed to the script. Never commit or print that token. Automated accessibility checks do not replace manual assistive-technology testing.

`npm run fixtures` creates ten authored PDF fixtures, a manifest and explicit human calibration questions. To run their **actual** model assessments, configure authorised AI access and the validation database, then run `REVIEWS_ENABLED=true node --env-file=.env.local --import tsx scripts/calibrate.ts --run`. This consumes AI quota and writes real results to ignored artifacts. It does not invent or substitute responses. Human reviewers must compare evidence, risk flags, coverage and consistency; numeric scores alone do not establish professional calibration. The synthetic fixture collection does not reproduce every real complex layout.

## Operational limits

- PDFs up to 50 MB, 100 physical pages and 240,000 extracted characters; visual batches use five pages. Larger documents must be reduced or split before upload. Parsing, active-content screening and visual reading can reject unusual or protected PDFs.
- Three new reports per visitor per day, twenty retained reports; anonymous network quotas prevent resetting the upload limit by clearing cookies; upload, search, retry, enquiry and sign-in rate limits. Report deletion preserves the daily upload and aggregate spend counters.
- Estimated spend pauses at $4 per report or $20 per daily accounting window, with a separate 240-stage-request ceiling. Concurrent/in-flight or interrupted requests and web search charges can exceed recorded spend; these are application controls, not a provider billing guarantee. Inspect Gateway usage as well as the founder dashboard. No billing plans were changed.
- Anonymous reports expire after seven days. Opening a saving link retains a report for 180 days; existing-account uploads also retain for 180 days. All private reads enforce expiry before the scheduled deletion runs. Deletion cascades through results and processing details; linked enquiries become unlinked. Daily cleanup requires the authenticated worker. Provider backups follow provider retention. Account/enquiry erasure requests need operational handling through the contact published in the privacy notice.
- Source matching verifies quotations against extracted or AI-transcribed text. It cannot independently prove that OCR is faithful to pixels, that an organisation’s claim is true, or that reported evidence is complete. Check the original before relying on a material finding.
- PDF exports embed DejaVu fonts. Unsupported characters are visibly represented by Unicode code points with an explanatory note, rather than silently removed.
- Password login remains optional and reuses the existing account service. Email saving uses Resend only when configured and explicitly requested. The email includes the assessment PDF and a private return link in the URL fragment. Opening that link verifies the recipient and grants access; it does not grant founder privileges or subscribe anyone to marketing.

## Deployment and rollback

The dedicated Vercel project is `my-impact-director`, root directory `apps/my-impact-director`, region `iad1`. Validation uses database `my_impact_director_validation` on the existing `sorp-console-validation` Neon branch. Production uses the dedicated `my_impact_director` database on the existing production branch, with a separately restricted runtime role. No existing product database was migrated.

1. Configure application-specific credentials and worker secrets separately for production and validation. Production `APP_ORIGIN` is `https://www.myimpactdirector.com`; set `REVIEWS_ENABLED=false` when intentionally pausing intake.
2. Deploy the dedicated project from `codex/my-impact-director`. Check `/api/health` against the production database and the authenticated worker before attaching domains. Verify HTTPS, the apex redirect, desktop/mobile pages, account login and enquiry persistence. Preserve DNS mail records and record prior website addresses for rollback.
3. Verify the configured AI model using the protected worker connectivity check and a genuine anonymous PDF. Update pricing assumptions and the privacy notice before any provider change. Keep new credential setup separate from other products.
4. Complete the genuine report journey: original source, all findings, both frameworks, saved results, export, enquiry and founder visibility, recovery and cross-account denial. Complete fixture/model evaluation and document professional calibration findings. Do not send customer emails.
5. Reviews are enabled following the genuine production check. Keep monitoring provider limits; a 429 pauses subsequent calls and schedules a retry. The production cron schedule is every minute. The test demonstrated automatic stage resumption without manually invoking the production worker.
6. To pause intake, set `REVIEWS_ENABLED=false` and redeploy. Existing saved results remain accessible. Roll back application code with Vercel deployment rollback; preserve the database and reports. Do not alter other product domains.

Verification for the rebuild: 25 scoring/document/security unit tests and 14 real-database checks pass. The database suite uses mocked model/identity/email transports and verifies guest isolation, expiry, optional PDF email payload, recipient grants, token replay rejection, logout and deletion. It is not a live email-delivery check. Twenty production desktop/mobile page checks and both genuine-result viewport journeys have no axe violations or horizontal overflow. Sticky navigation and source/logo loading were verified in the deployed browser. Five additional viewport journeys (360, 390, 820, 1366 and 1920 pixels) verify immediate upload actions, native mobile selection, menu dismissal, footer clearance and feedback retry handling. Six synthetic result/processing/recovery viewport contracts pass separately; their model/API responses are intercepted and are not evidence of real assessments. A genuine anonymous production feedback submission was verified in the database and removed by its exact marked QA ID. Runtime error/fatal logs for the final deployment were empty at the post-release check. Type checking, formatting and the production build pass.

The genuine anonymous test uses the publicly available Small Charity Support 2024 trustees’ report (17 pages). It verifies no email/password gate, retained original bytes, two complete frameworks, forty validated findings, source navigation, PDF export, saved-browser access and cross-guest denial. `scripts/anonymous-live.mjs`, `drive-anonymous.mjs`, `verify-anonymous-live.mjs` and `verify-real-results.mjs` keep private browser state outside source control and evidence in ignored artifacts. The linked test enquiry is explicitly marked QA/no follow-up. No customer email was sent. Production API and mobile-UI enquiries were verified in the database and removed by their exact test IDs. The anonymous production test report retains normal seven-day expiry. The latest campaign test completed in 18 processing attempts with no errors and an estimated $0.16303 of AI usage. Both scores were recomputed from all 40 findings, every source citation was validated, and the downloaded 47-page PDF was checked for all questions and complete source passages. The PDF source appendix deduplicates repeated evidence; footers are stripped only in the text-extraction test, not from the actual export. Human professional calibration of the ten authored fixtures remains separate from functional verification.

## Brand assets

The My Impact Director lockup was developed from the user’s supplied concept reference with their explicit approval. The My Social Impact, Claims Code, Social Impact Excellence and The Ideas Shed assets are established source assets copied from the existing product repositories. The concept’s indicative subscription prices are not published. Fonts are locally served DM Sans, Instrument Serif and Lora.

## Domain configuration

Production deployment immediately before the campaign redesign: `dpl_4u6tNquU8Az7yuKBA6f33yangrFh` (commit `e4faac0`). Earlier production deployment before the first rebuild: `dpl_DwkDgRs51Vc5VNYHbk177XYHqB5e` (commit `b3c5e2f`). DNS is already verified; this redesign does not need DNS changes. Apex A records are `216.150.1.1` and `216.150.16.1`; www CNAME is `2ad01a69f582f86c.vercel-dns-016.com.`. Existing MX/SPF/DKIM/DMARC records were preserved. Vercel manages TLS. Roll back application deployments while preserving the additive database schema and report records.
