# The Impact Edit: visual art-director engine 2.1.0

17 November 2026. Scope: My Impact Director only. Claims Code and Social Impact Excellence retain their existing models, rubrics and scoring. The existing extraction, accounts, source storage, learning sequences and delivery infrastructure remain shared.

## What was wrong

The previous reader-first stage received extracted text and descriptions of images, rather than the actual rendered publication. All assessment calls inherited the global nano model. Feature-by-feature scoring could reward orderly formatting and consistent branding despite a weak whole-publication reading experience. An after-the-fact numerical cap would not resolve that problem.

## New assessment

1. Render each physical page of reports of up to 30 pages at 1,600px width, JPEG quality 85 on white. Longer documents use the existing documented endpoints, evenly distributed pages and targeted data/story/risk selection. The result lists inspected pages and limitations. Renderings are reused in a private bounded 15-minute memory cache, never stored as additional database images.
2. A capable visual model forms a candid art-director opinion before receiving any criterion rubric, historical result or previous score. It receives every selected image and source text. It must record one observation for each supplied physical page and locate its strengths, weaknesses and opportunities on real inspected pages.
3. A separate pass receives that opinion, actual images, literal source passages and all 25 anchored 0–4 criteria. Application code validates evidence and calculates contributions with weights 25/30/25/10/10. Feature presence earns no automatic credit. This is a communication review, not an assessment of underlying impact validity.
4. A final art-director audit compares the first judgement with calculated pillar totals and re-examines up to ten relevant actual pages. It can replace unsupported criterion findings in either direction; it cannot choose a total or impose a cap. Original findings, corrections, explanations and re-examined pages are retained.

Missing or unreadable required pages withhold the whole-publication Visual Design estimates. A complete visual-render failure fails the stage with an honest retry/help message. Unreadable evidence is never scored as poor design. Quotes are copied from validated passages, not generated. All source material remains untrusted data.

## Model choice and reproducibility

The current Gateway catalogue and provider endpoints were checked on 17 November. Both `openai/gpt-6-astra` and `openai/gpt-6.1-terra` passed an actual synthetic visual recognition probe through the existing authorised Gateway/OIDC infrastructure. Both support images and strict JSON-schema output; requests pin the OpenAI provider, zero data retention and `store:false`.

A complete Astra request for the 23-page source exceeded the 160-second client window. No usage response was returned. It was not silently retried or treated as free: its conservative $3.040540 reservation remains held in the private calibration ledger. Exact billed cost could not be reconciled because the Gateway usage connector returned 403. This is not evidence that its billed cost was zero.

The production default is explicitly `openai/gpt-6.1-terra`, high reasoning, for all three passes. The catalogue describes this model as specialising in visual reasoning and writing; the full-document checks below actually completed with it. Maximum output tokens are 12,000 / 18,000 / 12,000. There is no silent downgrade to the old nano model. Scoped allowlisted overrides are available without changing the other methodologies. Each job retains the configuration chosen at its first pass across retries and environment changes. Provider model identifiers are pinned; deterministic reruns or a provider's immutable snapshot are not promised.

The saved record includes document SHA-256, methodology 2.1.0, prompt `art-director-2026-11-17.1`, configuration, response IDs, token usage, estimated token cost, model time, elapsed time, observations, first judgement, findings, computed pillar values, recommendations, limitations and completion date. Completed GET/refresh/login does not invoke AI. Explicit new-version reassessment creates a separate record and preserves the old one. The 2.0.1 methodology is archived alongside v1 and 2.0.0.

## Publication and interface

Overall numerical publication stays withheld during beta. Pillar values are labelled experimental. Automated contrast checks and an AI consistency audit do not establish independent human professional calibration. Creative judgement is partly subjective, and this is not professional assurance or technical PDF accessibility certification.

The first results section has a short “Your editorial verdict”, five larger semantic pillar headings and three expandable priorities. Detailed evidence, the pre-scoring opinion and saved assessment metadata remain available in the full report and PDF. The seven-slide educational sequence and genuine workspace status remain independent.

## Cost controls and operation

No new provider, key, subscription or billing upgrade was introduced. Existing per-review and daily application guards remain; they are threshold guards, not a guaranteed invoice ceiling. Known usage is retained even when schema/evidence validation fails. Unknown interrupted-call costs cannot be measured from a missing provider response.

The comparison CLI is `npm run impact-edit:assess:art-director -- path/to/report.pdf`; this is plan-only by default. Actual calls require the existing Gateway credential or project OIDC plus `--allow-paid --budget-usd=5`. Its private ledger reserves conservatively before each request, retains unknown reservations, caches completed exact requests, and prevents simultaneous runs in the same output directory. Token estimates exclude upload/extraction, storage, infrastructure and taxes; they are not an invoice guarantee.

Migration 011 adds review-local `engine_state` and stages 24–26; it does not alter or delete existing results. Intermediate first opinions never enter the shared document understanding used by the other frameworks. Completed state is compacted into the stored result. HTTP snapshots omit engine state and preserve existing verified-access restrictions on full findings.

Temporary preview-only, token-gated calibration routes are removed from the release source. Their private access links and budget are closed after calibration. Production exposes neither route.

## Live document comparisons

These are experimental pillar estimates, not published overall scores or human ratings. No previous score, target total or user criticism was included in a first-pass request. The Profit Impact source was the supplied 23-page PDF. The plain, adequate, dense and paired chart examples are explicitly fictional controls.

| Source | Pages inspected | Readability /25 | Hierarchy /30 | Design /25 | Story /10 | Data /10 | Estimated three-pass AI cost |
|---|---:|---:|---:|---:|---:|---:|---:|
| profit-impact | 23/23 | 12.5 | 16.5 | 12.5 | 6 | 4 | $0.3703 |
| simple-effective | 4/4 | 18.75 | 21 | 16.25 | 7.5 | 7 | $0.1562 |
| adequate | 3/3 | 18.75 | 16.5 | 11.25 | 6 | 5 | $0.1294 |
| dense-poor-hierarchy | 2/2 | 7.5 | 9 | 6.25 | 1.5 | 5 | $0.1170 |
| strong-data | 2/2 | 18.75 | 21 | 13.75 | 7 | 6 | $0.1171 |
| weak-data | 2/2 | 18.75 | 21 | 11.25 | 7 | 4.5 | $0.1104 |

Profit Impact’s independent first reading described dense justified text, long paragraphs, uneven spacing, repeated domino illustrations, uneven pacing, perspective pie charts, small low-contrast labels, and a crowded risk table. The criterion evidence cites the actual relevant physical pages. Consistent branding did not become evidence of excellent design. No report identity or target score was added to the rubric.

The two chart controls preserve the same surrounding copy. Clear bars received better data-presentation judgements than the weaker graphic. The final difference is modest and other shared weaknesses remain: this is directional discrimination, not proof of numerical calibration. A plain effective publication was recognised as good across all first-pass dimensions. The dense repetitive control was judged weak or seriously ineffective across the reading experience.

The published professional-design comparison is [charity: water FY2024](https://assets.ctfassets.net/2w85ks0ylymt/4cROclPCnsZlyXB57vNiNv/3f38d91afa8e941496afbc85c5e9f1ac/FY2024_Annual_Report.pdf). It is a nominated strong design comparison, not an independently human-rated excellent gold standard. No independent human sign-off has been manufactured.

Actual source hashes, complete responses, page observations, initial and corrected criteria, token ledger and exported PDFs are retained in ignored private artifacts. Customer PDFs and credentials are not committed. The same result builder and validators are used in calibration and the production pipeline.

## Verification

- 58 unit checks passed; 11 database-only tests skipped by the unit command.
- 29 real validation-database checks passed, including actual image rendering and transport with mocked provider responses, concurrent lease ownership, all new durable stages, retained configuration across an environment change, deterministic corrected totals, immutable historical results, reopen-without-inference, snapshot privacy and PDF export. Existing shared-account, email, rate-limit and payment contracts remain covered.
- 63 educational slides passed across all three methodologies at laptop, mobile and small-mobile sizes, including navigation and return from results.
- Actual new-model results for Profit Impact, the simple control and the dense control passed 15 desktop/tablet/mobile layout checks; screenshots were inspected. Larger pillar headings, three priorities and no horizontal overflow were checked. Desktop verdict and priorities fit the first screen.
- The actual Profit Impact PDF export has 26 pages and includes the first visual opinion, source evidence, saved prompt/model record and beta limitations.
- Type checking, formatting, production build, and the new CLI’s no-inference plan mode passed. Migration 011 was applied to validation before production, without deleting results.
