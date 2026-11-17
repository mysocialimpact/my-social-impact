# Impact Report Excellence v1.0 — calibration record

Software validation and professional calibration are distinct. The full criterion guidance is versioned in `src/lib/report-guidance.ts` and the original approved brief. Unit tests check all 25 criteria, exact totals, exclusions and the 22-overall/4-per-pillar thresholds. Rendering tests exercise actual PNG generation and physical-page mapping. Database contracts use synthetic model and email outputs; they are not professional assessments.

## Professional comparison set

Human reviewer sign-off is required before claiming professional calibration. No independent human reviewer has signed off this release. Use paired reports across these eight conditions:

| Condition | Check with the reviewer |
|---|---|
| Strong design and communication | High scores require purposeful execution, not decorative polish |
| Plain but effective | Readable modest typography and useful hierarchy can score highly |
| Polished but confusing | Visual finish must not mask poor clarity or narrative |
| Compelling stories, weak statistics | Storytelling and data communication should diverge appropriately |
| Dense, weak hierarchy | Cite inspected pages and distinguish density from necessary complexity |
| Short charity report | Do not demand a contents page, elaborate photography or large budgets |
| Long complex corporate report | Disclose representative visual coverage; no unseen-page claims |
| Scanned report | Separate extraction limitations from defects in the source design |

For each, retain source, inspected page images, findings, model/version, human criterion scores, disagreement reasons and revised guidance. Never manufacture reviewer approval or infer validity from automated tests. Broader representative real-model assessment and human calibration remain ongoing.

## First genuine production report

The existing public Small Charity Support 2024 report (17 pages) was reused without a new upload or extraction. The visual pass rendered and inspected physical pages 1, 2, 3, 5, 7, 8, 9, 11, 13, 15 and 17. All 25 findings persisted; 24 were assessable and the deterministic indicative total was 69/100. Photography/art direction was excluded because the sample did not support a reliable judgement. The 40-page PDF passed criterion-title, score recomputation and verbatim source-passage checks. The authorised internal recipient received one report email with the correct framework/organisation PDF attachment; one outbox attempt was accepted. Anonymous detailed export remains forbidden and anonymous API responses omit criterion details and visual observations.

Real provider rate limiting and an invalid visual page reference were encountered. Durable retries preserved completed image analysis. Visual page numbers are now constrained in the model schema to the actual inspected set. No quotas were reset and no scores were manually changed.

Spot checks against rendered pages confirmed green heading hierarchy, the single-column layout, footer numbering and visible coloured mnemonic lettering. A calibration issue remains: the model described the mnemonic lettering on page 9 as “placeholder elements”, a stronger interpretation than the source establishes. This illustrates why source mapping and successful software checks are not sufficient to validate creative judgement. Have a professional reviewer check contextual interpretations and score appropriateness across the eight representative report conditions before any validation claim.


## Revised Methodology v2.0 — revision 2.0.1 (17 November 2026)

The revised five pillars are Readability & Copy (25), Information Hierarchy (30), Visual Design (25), Storytelling (10) and Data Presentation (10). The 2.0.0 rubric is frozen in `report-methodology-2-0-0.ts`; historical result records are unchanged. New jobs inspect rendered pages, perform an AI-simulated first impression and five-question scan, assess anchored criteria, audit all 25 execution judgements, and perform a final consistency check. Full visual inspection covers reports up to 30 pages. PDF transparency groups now use the native Node DOMMatrix rather than the PDF library placeholder.

### Calibration finding and publication decision

Overall numerical publication is paused for this revision. Evidence and recommendations remain available as beta assessments; criterion and pillar values are explicitly experimental. The model separated plain clear reporting from decorative-but-confusing and dense reporting, but did not reliably distinguish the controlled data-design pair. Both data-presentation totals were 6/10, and the weak representation received a higher representation-choice criterion than the clear bar comparison. This fails the intended comparative calibration test. Do not describe this release as independently professionally calibrated.

The following are unpublished diagnostic calculations, not public scores or independent human ratings:

| Case | Physical pages inspected | Assessed criteria | Unpublished calculation |
|---|---:|---:|---:|
| profit-impact | 23/23 | 25/25 | 64.75 |
| charity-water-2024 | 16/16 | 25/25 | 64.25 |
| simple-effective | 4/4 | 25/25 | 92.5 |
| attractive-confusing | 2/2 | 25/25 | 39.5 |
| dense-poor-hierarchy | 2/2 | 25/25 | 35.5 |
| strong-data | 2/2 | 24/25 | 69.75 |
| weak-data | 2/2 | 25/25 | 68 |

Profit Impact is the user-supplied 23-page report. The public professional-design comparison is [charity: water FY2024](https://assets.ctfassets.net/2w85ks0ylymt/4cROclPCnsZlyXB57vNiNv/3f38d91afa8e941496afbc85c5e9f1ac/FY2024_Annual_Report.pdf), linked from its official financials page. It is a professional-design comparison, not an independently rated excellent gold standard. The other five reports are clearly labelled fictional controlled fixtures. Source PDFs, hashes, model responses, 25 criterion judgements, inspection coverage, revised PDFs and the cost ledger are retained in ignored calibration artifacts. Source citations and deterministic aggregation were revalidated offline for every case.

A legacy final-check instruction incorrectly inferred that a high creative score implied tested technical accessibility. The revised final check explicitly separates communication quality, technical accessibility testing limits, evidence credibility and independent human validation. A missing screen-reader test does not itself reduce a communication score. This correction restored the clear control’s consistent diagnostic result; the data-design discrimination failure remains, so publication stays paused.

All actual model assessments used the production model `openai/gpt-5.4-nano`. A trial of a stronger audit model was rejected before inference by the existing Gateway free-credit entitlement; no top-up or plan change was made. The complete run remained below the US$2 hard cap on both client and private preview relay. Catalogue-based token estimate: US$0.9165; conservative reserved upper bound including failed/uncertain calls: US$1.5720. This is not an invoice calculation. The temporary relay was removed from release source, its budget sealed, preview access revoked and preview enablement disabled. No production review data was written and no emails were sent by calibration.

### Verification and infrastructure

51 unit checks and 27 real validation-database checks passed. The latter cover durable stages 22/23, actual rendered-image transport, criterion corrections and deterministic aggregation, withheld totals, preserved historical versions, owner-only persistent selections, account/guest access, report reuse, exports and synthetic email contracts. Learning QA exercised 147 slides across seven viewport/accessibility profiles; navigation QA covered authenticated and authorised guest contexts on nine routes, refresh, logout and uninterrupted client navigation. Results were checked at 1366×768, 1440×900, 1920×1080, 390×844 and 320×640, with real screenshots inspected. Subsequent production verification is recorded in the task’s ignored artifacts.

Migration 008 adds an owner-bound selected-report table and app-role grants. Migration 009 widens the existing job-stage check to 23. Both were applied first on the validation branch and then only to the My Impact Director production database. Social Impact Claims Code and Social Impact Excellence scoring rules and versions remain unchanged. Other applications and shared authentication services were not modified.

A focused concurrent database test also pauses a Claims Code action-plan call, commits a new shared-source observation, then resumes the call. The observation survives, and Claims Code still completes at its unchanged 1.0.0 score. Read-only assessment stages no longer overwrite source pages/notes; visual and editorial stages atomically merge keyed additions.

Live-browser verification additionally exposed a session-loading race in assessment selection: a signed-in visitor could click before the child component finished its account check and be sent to signup. Assessment actions now wait for the check. A delayed-identity browser regression verifies one start and no signup redirect.

## Visual art-director engine 2.1.0

The subsequent multimodal engine and new real-document comparison record are documented in [impact-edit-art-director.md](impact-edit-art-director.md). The earlier results and limitations above describe their historical engines; they are not overwritten by this release.
