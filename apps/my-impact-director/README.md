# My Impact Director

Evidence-grounded reviews of impact reports against the Social Impact Claims Code and Social Impact Excellence frameworks. This is a standalone Next.js application in the `my-social-impact` repository; the parent website has a separate deployment. Its TypeScript and ESLint configurations narrowly exclude this independent app. Existing website runtime code and deployment settings are unchanged.

## Release status

The public site is live at **https://www.myimpactdirector.com**, with the apex address redirecting to `www`. `REVIEWS_ENABLED=false` keeps assessment creation visibly paused during validation. Application-specific production and validation database credentials and worker secrets have been approved and configured. Genuine account registration/login, report upload and private download, public report discovery and enquiry persistence have passed in the hosted validation environment. A genuine completed assessment, saved final results and their export remain unverified. Do not enable public reviews until those checks pass.

## Architecture

- Next.js App Router, TypeScript, accessible responsive React components and locally served fonts.
- Existing My Social Impact account API at `/api/readiness-account`. Only the existing HttpOnly session cookie is forwarded; account identity and founder status are verified on the server. No second identity database or email sender is introduced.
- A private `director` schema in a dedicated Neon database. Runtime credentials have access to this schema without database administration privileges. Original PDFs are private database objects, never public URLs.
- Durable PostgreSQL job stages, row locks, expiring leases, fencing tokens, persisted checkpoints, bounded retries and a protected scheduled worker. Requests initiate processing with Next.js `after`; production cron resumes work after interruptions.
- Vercel AI Gateway with project OIDC authentication, OpenAI-only routing and zero data retention requested for document assessment. Model: `openai/gpt-5.4-mini`. The Gateway free tier rejected this model. A preview-only `openai/gpt-5.4-nano` connectivity check and native PDF input succeeded, but repeated quotation validation failures and provider rate limits prevented a completed assessment. Direct OpenAI key setup has been approved and is awaiting the account/project picker; no new key has been created and no billing plan has changed.
- Strict Zod intermediate schemas; deterministic score calculations; source quote/page validation before publishing; separate material claim analysis. No model-generated aggregate scores are accepted.
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

Run the initial SQL migration using a database owner connection, then switch to the restricted runtime connection. Never grant runtime migrations or administrative roles. `npm run dev` starts the app; `npm run build` creates the production build. In a nested checkout the app’s `postcss.config.mjs` deliberately avoids inheriting parent Tailwind configuration.

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

- PDFs up to 4 MB, 100 physical pages and 240,000 extracted characters; visual batches use five pages. Larger documents must be reduced or split before upload. Parsing, active-content screening and visual reading can reject unusual or protected PDFs.
- Three new reports per account per day, twenty retained reports; upload, search, retry, enquiry and sign-in rate limits. Report deletion preserves the daily upload and aggregate spend counters.
- Estimated spend pauses at $4 per report or $20 per daily accounting window, with a separate 240-stage-request ceiling. Concurrent/in-flight or interrupted requests and web search charges can exceed recorded spend; these are application controls, not a provider billing guarantee. Inspect Gateway usage as well as the founder dashboard. No billing plans were changed.
- Original reports and assessments expire after 180 days. Deletion cascades through results and processing details; linked enquiries become unlinked. Daily cleanup requires the authenticated worker. Provider backups follow provider retention. Account/enquiry erasure requests need operational handling through the contact published in the privacy notice.
- Source matching verifies quotations against extracted or AI-transcribed text. It cannot independently prove that OCR is faithful to pixels, that an organisation’s claim is true, or that reported evidence is complete. Check the original before relying on a material finding.
- PDF exports embed DejaVu fonts. Unsupported characters are visibly represented by Unicode code points with an explanatory note, rather than silently removed.
- Password login reuses the existing account service. Password reset links to that service. Magic links and a new email service were not added.

## Deployment and rollback

The dedicated Vercel project is `my-impact-director`, root directory `apps/my-impact-director`, region `iad1`. Validation uses database `my_impact_director_validation` on the existing `sorp-console-validation` Neon branch. Production uses the dedicated `my_impact_director` database on the existing production branch, with a separately restricted runtime role. No existing product database was migrated.

1. Configure application-specific credentials and worker secrets separately for production and validation. Production `APP_ORIGIN` is `https://www.myimpactdirector.com`; keep `REVIEWS_ENABLED=false` while validation is incomplete.
2. Deploy the dedicated project from `codex/my-impact-director`. Check `/api/health` against the production database and the authenticated worker before attaching domains. Verify HTTPS, the apex redirect, desktop/mobile pages, account login and enquiry persistence. Preserve DNS mail records and record prior website addresses for rollback.
3. Complete the approved OpenAI account/project selection and secure key setup. Update provider configuration and the privacy notice for the actual API data controls before sending private reports. Use the protected synthetic connectivity check first.
4. Complete the genuine report journey: original source, all findings, both frameworks, saved results, export, enquiry and founder visibility, recovery and cross-account denial. Complete fixture/model evaluation and document professional calibration findings. Do not send customer emails.
5. Only enable reviews after those checks pass. Confirm the production worker schedule, retention cleanup and operational monitoring.
6. To pause intake, set `REVIEWS_ENABLED=false` and redeploy. Existing saved results remain accessible. Roll back application code with Vercel deployment rollback; preserve the database and reports. Do not alter other product domains.

Verification on 15 November 2026: 23 scoring/document/security tests passed; the real-database suite passed all 12 checks; 18 public-page browser checks and two populated-results viewport journeys passed without axe violations. Type checking and the production build passed. The PDF export was visually inspected. Real hosted registration/login, private PDF upload/download integrity, public PDF discovery and linked enquiry persistence subsequently passed. A real report reached principle assessment, but strict source quotation validation prevented publication of unverifiable findings. Ten authored calibration documents were enqueued; model assessment remains incomplete. Genuine completed results/export and professional calibration remain outstanding.

The public site may launch with reviews visibly paused. The assessment service is not commercially ready until the outstanding genuine deployed journey passes. Production deployment `dpl_DwkDgRs51Vc5VNYHbk177XYHqB5e` reached READY from commit `b3c5e2fe313a31559bd28565d9db2fa1f4df9360` on 15 November 2026. `www.myimpactdirector.com` serves HTTPS successfully; the apex returns a permanent 308 redirect preserving the path. Both domain configurations have no DNS conflicts. Existing MX, SPF, DKIM, DMARC and other non-website records were preserved. Prior website A records were `217.160.0.179`; prior apex/www AAAA records were `2001:8D8:100F:F000:0:0:0:27C`. The new apex A records are the recommended `216.150.1.1` and `216.150.16.1`; www uses `2ad01a69f582f86c.vercel-dns-016.com.`. Vercel manages TLS and the remaining system records.

Public-domain verification passed: 18 desktop/mobile page checks with no axe violations or overflow, real mobile login, server identity, founder access denial, private endpoint denial, disabled intake in both UI and API, www sitemap/robots, healthy production database and authenticated retention worker. A test enquiry was submitted through the production UI, verified in the production database, then removed by its exact test ID and message. No email was sent. The production smoke script is `scripts/verify-production.mjs`; it expects an existing private test-account JSON path and never prints credentials. Its enquiry should be verified and removed after each run. Ignored screenshots and DNS snapshots are in `artifacts/production` and `artifacts/verification`.
