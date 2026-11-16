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
