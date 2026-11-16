# The Impact Edit v2 — implementation and calibration record

## Confirmed diagnosis

The uploaded Profit Impact 2026 PDF matches the source of production review `8dcde927-1102-4be7-9c60-4fdd80084426` exactly: SHA-256 `08b9bae868f517fa895afc5d2daed37cf51d660182f488428520d8cafcabf236`. Its stored v1 score is **84**, correctly summed from Clarity 18, Storytelling 17, Design 16, Engagement 17 and Communication 16 (each out of 20). This is not an arithmetic error.

The processing record confirms six successful visual-inspection calls and five successful pillar calls using `openai/gpt-5.4-nano`. The visual record contains physical pages **1, 2, 3, 4, 7, 9, 12, 15, 18, 20 and 23**. Thus it did see rendered images in the visual pass, rather than only extracted text. However, v1 pillar-scoring calls received the written observations and source passages, not the images. The chart-heavy pages **5–6** and the risk table on **17** were not visually sampled.

The stored reasons explicitly reward presence and consistency: Structure 4 for a sequence including contents/summary/pillar progress; Navigation 4 for contents and headings; Colour/Identity 4 for a repeated palette; Visual Engagement 4 for diagrams, a pie chart and photo cards. Meanwhile Plain English, Human Stories and Case Studies each receive 3 despite their reasons describing substantial friction or undeveloped material. Data Communication receives only 2 but represents one of 25 equal criteria. Overlapping Clarity, Engagement and Communication repeat related strengths, while there is no dedicated accessibility pillar or verified technical-accessibility check. These are confirmed structural weaknesses in the assessment, not proof that every individual judgement is objectively wrong.

Offline PDF inspection confirms tags are present, 51 sampled figure tags have no alt descriptions, and character-weighted median text size is 10 points on pages 2, 3, 5, 6 and 17. The point-size statistic includes captions and is not an automatic body-text classifier. Tag presence does not prove reading-order quality. Missing figure-tag descriptions do not by themselves prove every image lacks an adequate adjacent textual equivalent.

### Remaining uncertainty

The model's internal reasons for optimism cannot be recovered. Enlarged images without physical-size metrics may have encouraged generous legibility judgements, but that is a hypothesis. Whether the smaller model, the descriptive visual intermediary or prompt interpretation contributed most requires controlled model comparison. The reader's suggested 44 is a provisional art-direction opinion, not an imposed target. No independent professional reviewer sign-off is claimed.

## Locked v2 rubric and calculation

The source of truth is `src/lib/report-methodology.ts`: five criteria per pillar, with explicit execution-specific anchors at 0 absent/seriously obstructive, 1 weak, 2 adequate, 3 strong and 4 exceptional.

| Pillar                    | Maximum | Criteria                                                                                                                              |
| ------------------------- | ------: | ------------------------------------------------------------------------------------------------------------------------------------- |
| Readability and hierarchy |      20 | Physical text legibility; editing/load; meaningful headings/navigation; opening/outcome hierarchy; page scanning                      |
| Storytelling              |      20 | Problem/action/outcomes; specific human experience; integration of examples/evidence; candour/setbacks/limits; progression/next steps |
| Visual design             |      25 | Composition/spacing; typographic craft; rhythm/cohesion; imagery/graphic execution; publication finish                                |
| Data communication        |      20 | Representation choice; labels/legibility; denominators/periods/scope; sources/uncertainty; takeaway                                   |
| Accessibility             |      15 | Contrast/non-colour cues; magnification; structure/reading order; image/chart alternatives; assistive usability                       |

For each pillar: `weight × sum(assessable scores) / (4 × assessable criterion count)`. Zero remains assessable. Genuine inapplicability and unavailable evidence are explicitly excluded. At least four criteria per pillar and 22 overall must be assessable. The total uses unrounded contributions; displayed values round to two decimals. Insufficient required visual coverage suppresses the overall score.

The Excellent label requires raw total ≥80, no pillar below 50% of its maximum, no unresolved serious readability/accessibility barrier and a successful simulated two-minute reader test consistent with the editorial verdict. Critical legibility, contrast, reading-order or essential-alternative criteria scored 0/1 block Excellent. These rules affect the label, never silently cap or change the total. Engagement becomes a qualitative whole-report editorial judgement, not another score.

Every page is inspected for reports up to 24 pages. Longer reports use endpoints, evenly spaced pages and multiple targeted data/risk/human-example pages. Pillar scoring receives actual rendered images, not only descriptions. PDF checks supply physical text metrics, tag roles, tagged text order and figure-description presence; results separately list untested screen-reader/user behaviour, reflow, keyboard access and measured contrast. Untested assistive usability is unassessable. Source extraction failures must never become low design/accessibility scores.

## Offline comparison: reference judgements, not new AI results

The rubric was written before assigning the following reference judgements. Only the Profit Impact v1 result is an actual stored model assessment. All new scores and both fixture baselines below are explicitly assistant-authored reference judgements after offline page inspection. They test the calculation and discriminate among communication qualities; they do not establish model calibration or independent professional agreement.

| Report                                     |           v1 |    v2 reference | New pillar contributions, in order above |
| ------------------------------------------ | -----------: | --------------: | ---------------------------------------- |
| Profit Impact 2026, 23 pages               |    84 actual | 39.63 reference | 9/20; 9/20; 10/25; 6/20; 5.63/15         |
| Clear designed fictional fixture, 4 pages  | 92 reference |    88 reference | 20/20; 18/20; 18.75/25; 20/20; 11.25/15  |
| Plain effective fictional fixture, 4 pages | 88 reference |    88 reference | 20/20; 18/20; 18.75/25; 20/20; 11.25/15  |

Profit Impact evidence: opening crowding and mission-led hierarchy (1–4); difficult 3D pies, labels and bases (5–6, 12); a small risk table (17); authentic but late, loosely integrated voices (18–20). Genuine strengths include useful navigation, candid risks and weaknesses (8, 10, 13, 15–17), basic branding and respectful authentic imagery. The reference judgement does not force 44 and remains open to disagreement.

Both authored comparison fixtures make outcomes, scale, caveats and dated next steps immediately available on page 1; page 2 gives complete values, period, denominator, source and uncertainty; page 3 integrates a specific fictional experience and candid setbacks; page 4 gives decisions and access limitations. One uses restrained designed emphasis and bars; the other uses plain typography and textual values. Both have actual PDF tags and readable text. Neither receives a fictitious assistive-user-test score. This illustrates why stronger execution standards need not lower a simple effective report across the board.

Run `npm run impact-edit:fixtures` and `npm run impact-edit:reference`. Full criterion/page reference reasoning is written to ignored `artifacts/impact-edit-v2/offline-comparison.md` and JSON. All programme facts in the fixtures are invented and labelled accordingly; no real beneficiary information is used.

## Preservation and product changes

Only new report-framework selections use database version `2.0.0-report`; completed v1 reviews are not rescored or overwritten. A new result shows its version, weighted pillar maxima, anchored reasoning, reader test, rating rule and checked/unchecked accessibility limitations. Historical exports and labels use v1 criterion names and weights. The archived methodology remains at `/methodology/impact-report-excellence/v1`. Existing reports can explicitly request v2; older version links remain available. The workspace chooses the newest version without deleting history. No schema migration, dependency addition, redesign, or Claims Code/Excellence methodology change is required.

## Paid verification approval and several-report workflow

`npm run impact-edit:assess -- <one.pdf> <two.pdf>` only prints a plan. No model or email call is made by default. A paid run additionally requires explicit `--allow-paid --budget-usd=2.00` after approval and an existing secure Vercel OIDC/Gateway credential. The script never provisions or prints credentials, sends email, or writes production records.

The prepared comparison brief is three v2 assessments (Profit Impact and the two fixtures), plus fresh v1 assessments of the two fixtures; the actual stored Profit Impact v1 result is reused. That is up to 52 model calls, no automatic retries, on the same `openai/gpt-5.4-nano` model recorded in the original review. Verified catalogue rates are US$0.20/million input tokens and US$1.25/million output tokens. Actual token-based spend cannot be known in advance. The **proposed maximum authorised total is US$2.00**, enforced by reserving a conservative US$0.0975 before each outbound call, reconciling usage, preserving the ledger across restarts, and caching completed responses. A changed model catalogue stops the run. The test can stop early if it cannot reserve the next call within the cap. No payment or assessment has been triggered by preparing this plan.

On an authorised run the script writes versioned findings, PDFs, before/after JSON and a cost ledger under ignored `artifacts/impact-edit-v2/paid`. To assess several other reports, pass their paths to the same command; without `--compare-legacy`, only v2 is assessed. The ordinary homepage uploader will offer the revised method once released.

## Changed files

- `src/lib/report-methodology.ts`: locked v2 criteria, execution anchors, weights and scoring explanation.
- `src/lib/report-visual.ts`, `report-accessibility.ts`, `report-verdict.ts`, `assessment.ts`, `pipeline.ts`: image selection/input, honest technical checks, anchored validation, weighted totals and reader/rating logic.
- `src/lib/rubric.ts`, `reviews.ts`, `workspace.ts`, `passages.ts` and the review API: version-aware selection and historical compatibility; unchanged schemas/prompts for the other two methodologies.
- `src/components/review-results.tsx`, `review-experience.tsx`, `creative-caveat.tsx`, `admin.tsx`, plus `src/lib/export.ts` and `branding.ts`: weighted/current versus historical labels, version links, disclosures and PDF output.
- The two methodology routes, relevant homepage/overview descriptions, and this record: current explanation and archived v1 documentation.
- `scripts/assess-impact-edit.ts`, `impact-edit-fixtures.ts`, `impact-edit-reference.ts`, `qa-impact-edit-v2.mjs`; focused tests and package commands: reproducible offline checks and explicitly gated model calibration.

## Checks and deployment

Production build and TypeScript checks pass. 40 unit checks pass, including weighted aggregation, historical scoring, rating gates, missing visual evidence, actual rendered-image input, PDF metadata, and a network-isolated budget-restart test. All 23 existing validation-database checks pass using mocked AI/email transports, plus the dedicated version-coexistence check. Existing learning-layout checks cover 105 screens. Browser checks also cover original/v2 result labels, weighted bars, history links, reader/accessibility disclosures and versioned methodology pages at laptop and phone sizes.

Production release is pending the explicitly required approval for paid model calibration. No live model assessments or test emails have been sent for this task. Historical production data remain unchanged. Offline reference judgements must not be represented as new production results.
