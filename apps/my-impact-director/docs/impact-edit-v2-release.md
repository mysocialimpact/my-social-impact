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

## Actual paid model comparison

The user approved a hard US$2.00 cap. These are actual `openai/gpt-5.4-nano` assessments under the locked rubric, using the same model recorded in the original Profit Impact review. The original stored Profit Impact v1 result is reused; both fixture baselines were freshly assessed under v1. All new results assess 24/25 criteria; assistive-user testing is explicitly unassessable. The two locally authored fictional fixtures are suitable communication controls, not independent professional reviewer endorsements or real programme evidence.

| Report                                      | v1 actual /100 | v2 actual /100 | v2 rating | v2 contributions: Readability; Storytelling; Visual; Data; Accessibility |
| ------------------------------------------- | -------------: | -------------: | --------- | ------------------------------------------------------------------------ |
| Profit Impact 2026 (23 pages)               |             84 |             66 | Strong    | 14/20; 16/20; 17.5/25; 11/20; 7.5/15                                     |
| Designed fictional fixture (4 pages)        |             92 |             80 | Excellent | 17/20; 17/20; 18.75/25; 16/20; 11.25/15                                  |
| Plain effective fictional fixture (4 pages) |             83 |          79.75 | Strong    | 19/20; 15/20; 17.5/25; 17/20; 11.25/15                                   |

The v1 pillar order is Clarity; Storytelling; Design; Engagement; Communication, all /20. Baselines:

- Profit Impact 2026 (23 pages): 18/20; 17/20; 16/20; 17/20; 16/20.
- Designed fictional fixture (4 pages): 20/20; 18/20; 20/20; 14/20; 20/20.
- Plain effective fictional fixture (4 pages): 18/20; 15/20; 19/20; 13/20; 18/20.

Profit Impact: the new method directly sees all 23 pages, including the crowded opening and small-type passages (1–4), chart labels and presentation choices (5–6), dense risk table (17), and late human material (18–20). Its data/accessibility results now expose communication weaknesses rather than allowing repeated navigation/branding credit to dominate. It also retains credit for candid discussion of weaknesses and authentic material. The actual model score is higher than the provisional 44/100 art-direction opinion and the earlier assistant-authored offline reference. In particular, visual-design judgement remains comparatively generous. This disagreement is unresolved; no target total or report-specific rule was added, and human review remains appropriate. An earlier safeguarded candidate scored 63.94; after the final reasoning safeguards it scored 66. Both are retained in the ignored audit record. This variation is another limit of automated creative judgement, not a reason to select the result nearest 44.

Both controls put main outcomes, scale, caveats and dated next steps on page 1; complete values, bases, periods and uncertainty on page 2; a specific fictional experience and setbacks on page 3; and decisions/access limitations on page 4. The designed control uses outcome emphasis and labelled bars; the plain control uses direct textual values. Thus simple reports can score strongly without photography or decoration. The total reductions differ: 18 points for Profit Impact, 12 for the designed control and 3.25 for the plain control. This is not a fixed downward adjustment; the plain control retains high readability credit without decoration. Three cases do not establish broad benchmark performance; further reports and independent human judgements are still needed.

The first designed control scored 78.75 under v2, which exposed an actual oversized-title overlap on its final page. The fixture generator now fits titles to the available width; the rubric was not changed to raise its score. The original fixture and result remain in ignored audit artifacts. Earlier offline reference scores are deliberately excluded from this actual-results table.

Calibration also exposed invalid source references, an omitted required page reference, ambiguous duplicate-image labels, and reasoning about a nonexistent higher anchor. The final request schema constrains source IDs and scored page references; each image carries its physical page and normal/enlarged view label; anchored reasoning is checked against the 0–4 scale. A verified missing-structure judgement may use weak anchor 1; it is not forced to the seriously-obstructive anchor 0, while adequate-or-better structural credit requires actual PDF structure. All reruns share the original persistent cap and ledger.

**Total provider-reported cost across every candidate and rerun: US$0.81113213, from 92 paid requests.** Conservative token-based accounting: US$0.82260605. Completed-response caches and both client/server reservations prevented spending beyond US$2.00. No test emails were sent, and no production review data were written. Outputs include versioned JSON, PDFs and before/after comparisons under ignored `artifacts/impact-edit-v2/paid`.

## Preservation and product changes

Only new report-framework selections use database version `2.0.0-report`; completed v1 reviews are not rescored or overwritten. A new result shows its version, weighted pillar maxima, anchored reasoning, reader test, rating rule and checked/unchecked accessibility limitations. Historical exports and labels use v1 criterion names and weights. The archived methodology remains at `/methodology/impact-report-excellence/v1`. Existing reports can explicitly request v2; older version links remain available. The workspace chooses the newest version without deleting history. No schema migration, dependency addition, redesign, or Claims Code/Excellence methodology change is required.

## Several-report workflow and approved spend controls

`npm run impact-edit:assess -- <one.pdf> <two.pdf>` only prints a plan. No model or email call is made by default. A paid run additionally requires explicit `--allow-paid --budget-usd=2.00` after approval and an existing secure Vercel OIDC/Gateway credential. The script never provisions or prints credentials, sends email, or writes production records.

The approved comparison brief covers three v2 cases, fixture v1 baselines and the stored Profit Impact v1 result. The initial plan was 52 calls; all manual validation/layout corrections and reruns count toward the same approved US$2.00 total. Verified catalogue rates are US$0.20/million input tokens and US$1.25/million output tokens. The runner reserves US$0.0975 per outbound call, reconciles usage, preserves its ledger across restarts and caches completed responses; changed catalogue bounds stop the run. Reusing the default output directory also reuses its budget: use a separate output directory only for a separately authorised batch, never to reset this task's cap.

On an authorised run the script writes versioned findings, PDFs, before/after JSON and a cost ledger under ignored `artifacts/impact-edit-v2/paid`. To assess several other reports, pass their paths to the same command; without `--compare-legacy`, only v2 is assessed. The ordinary homepage uploader will offer the revised method once released.

## Changed files

- `src/lib/report-methodology.ts`: locked v2 criteria, execution anchors, weights and scoring explanation.
- `src/lib/report-visual.ts`, `report-accessibility.ts`, `report-verdict.ts`, `assessment.ts`, `pipeline.ts`: image selection/input, honest technical checks, anchored validation, weighted totals and reader/rating logic.
- `src/lib/rubric.ts`, `reviews.ts`, `workspace.ts`, `passages.ts` and the review API: version-aware selection and historical compatibility; unchanged schemas/prompts for the other two methodologies.
- `src/components/review-results.tsx`, `review-experience.tsx`, `creative-caveat.tsx`, `admin.tsx`, plus `src/lib/export.ts` and `branding.ts`: weighted/current versus historical labels, version links, disclosures and PDF output.
- The two methodology routes, relevant homepage/overview descriptions, and this record: current explanation and archived v1 documentation.
- `scripts/assess-impact-edit.ts`, `impact-edit-fixtures.ts`, `impact-edit-reference.ts`, `qa-impact-edit-v2.mjs`; focused tests and package commands: reproducible offline checks and explicitly gated model calibration.

## Checks and deployment

Production build and TypeScript checks pass. 42 unit checks pass, including weighted aggregation, historical scoring, rating gates, missing visual evidence, actual rendered-image input, PDF metadata, and a network-isolated budget-restart test. All 23 existing validation-database checks pass using mocked AI/email transports, plus the dedicated version-coexistence check. Existing learning-layout checks cover 105 screens. Browser checks also cover original/v2 result labels, weighted bars, history links, reader/accessibility disclosures and versioned methodology pages at laptop and phone sizes.

The release preview verifies current/archived methodology pages and a 404 for the removed calibration API. Temporary preview credentials are disabled, the test counter is closed and the staging-only test user is removed. Production deployment and post-deploy verification are recorded in [PR #11](https://github.com/mysocialimpact/my-social-impact/pull/11). Historical production results remain unchanged; calibration artifacts are not imported into user workspaces.
