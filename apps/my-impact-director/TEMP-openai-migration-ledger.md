# My Impact Director direct OpenAI migration

Implementation and live verification of PR #22, authorised 28 November 2026.
Scope: dedicated selected-project credentials, direct OpenAI transport, three
preview assessments, billing/cost verification, and production release with
rollback. Preserve all current models, reasoning, methodology and design.

| Guidance reviewed | Decision and evidence |
| --- | --- |
| Model selection | Preserve `AI_MODEL=openai/gpt-5.4-nano` in both environments; art director/scoring/audit use existing `gpt-6.1-terra`. No model upgrade. |
| Instruction file naming | Preserve existing AGENTS.md. |
| Chat Completions / Responses | Assessment calls retain Chat Completions and strict JSON schemas. Discovery retains Responses with required web search. Only provider transport/billing changes. |
| Streaming | Existing buffered, validated job stages retained; incomplete output cannot be published. |
| WebSocket mode | Not applicable to independent HTTP assessment stages with database leases. |
| Privacy / Zero Data Retention | Preserve `store:false`, private reports and existing retention. ZDR eligibility is not established by `store:false`; organisation-level approval remains unverified. |
| Data residency | Selected project reports Global. No endpoint or regional-processing change. |
| Processing tiers | Preserve project Standard default; no Priority, Flex, Batch or Reserved change. Current standard rates checked against official pricing documentation. |
| Cache keys / extended retention | No new cache retention or keys: outside explicitly requested transport-only scope. |
| Cache breakpoints / diagnostics | No Responses migration of assessment stages or new comparison-ID state; existing independent buffered requests retained. |
| State management | Existing database jobs, immutable completed results, retries, leases and spend limits retained. No provider-side conversation storage. |
| Instruction persistence | Every independent assessment request retains its system safety and stage instructions. |
| Encrypted reasoning | No cross-turn reasoning replay in current application; no new conversation state. |
| Reasoning effort | Preserve medium for general stages and high for all art-director stages. |
| Reasoning context / summaries / preambles | No conversation history or user-visible reasoning stream is introduced. |
| Verbosity | Preserve current defaults and existing bounded structured schemas; no product change. |
| Maximum output tokens | Preserve existing general 14000, art director 12000, scoring 18000 and audit 12000 limits. |
| Assistant phases | Not applicable to the current single-response structured assessment path. |
| Compaction | Not applicable to bounded independent document stages. |
| Structured outputs | Preserve strict schemas, exact-source evidence checks and validation/retry behavior, including prepared pillar-summary repair. |
| Tool choice | Discovery retains required web search; document assessment has no tools. |
| Tool search / additional tools | Not applicable to one fixed discovery tool. |
| Parallel tool calls | No change to execution order or concurrency. |
| Programmatic tool calling | Not applicable; no model-directed application tools. |
| Model-aligned interfaces | No tool redesign in scope. |

## Live verification

- Dedicated restricted key created through the authorised local browser and saved
  as Vercel Secrets for Preview and Production. No plaintext written to this repo.
- Organisation/project headers match the user's explicit billing selection.
- Initial preview: `dpl_AzebNyWFuQpgTZC3AH4NT3EkcJPf`, commit `0e87d5a`.
- Report discovery and document understanding succeeded through direct OpenAI.
- Live Small Charity Support 2023 design review exposed a pre-existing PDF.js
  initialisation-order failure (`Missing field b`) before an AI charge. The
  native DOMMatrix now loads before PDF.js in all three document entry points.
  A synthetic scaled-hairline regression fails before the fix and passes after it.
- Local build was blocked by dependency security advisories. Applied the smallest
  patched versions: Next.js 16.4.5 and @vercel/functions 3.10.6, retaining the
  existing dependency set. `npm audit` now reports zero vulnerabilities; 68 tests
  pass and 11 database checks remain skipped without a local database credential.
- Standard-font assets are packaged for font-free serverless hosts and resolved
  from the actual deployed function root. Both font-free text rendering and
  transformed-stroke regressions pass. Local and Vercel production builds pass.
- Final public-report verification (Small Charity Support 2023, 17 physical pages):
  Claims Code 61.25 / 20 criteria; Excellence 67.5 / 20 criteria; Design Review
  47 / 25 criteria. Every review completed with five pillars. The design review
  inspected all 17 pages, retained high reasoning and the existing model/token
  settings, and its final consistency audit reported no contradictions.
- Each review's total exactly matches its processing-event cost ledger, with
  model, response ID and token counts recorded. Document preparation cost
  $0.036975; Claims $0.059609; Excellence $0.062522; Design $0.497936 including
  earlier attempts. Combined public-report token-rate estimate: $0.657042.
  The successful final design run alone was $0.304565.
- OpenAI key-scoped analytics showed usage and charges in the selected project.
  The billed display is delayed and is not treated as an exact invoice total.
- Production: `dpl_FKcnSPCwt29iJ9bij3o2wK78giuE`, runtime commit `9c0ea33`,
  READY on www.myimpactdirector.com and myimpactdirector.com. Public health,
  homepage, review entry, privacy and methodology return 200 without Vercel
  login. Privacy accurately describes direct OpenAI processing. No production
  error/fatal logs were found in the bounded release scan.
- A production direct-API document smoke completed with the preserved Nano
  snapshot and a $0.008367 estimate matching its stage ledger.
- All three public-report result views were opened in the signed-in local
  browser. Preview emails stayed disabled. No test email was sent by this work.
- The temporary automation bypass was revoked and the local validation worker
  credential removed. Existing project SSO protection was preserved.
- Required migration and release work is complete. No model, reasoning,
  methodology, score-calculation, design or user-flow changes were introduced.
- Rollback retained: `dpl_BQKTC222F3nnTGHiGAchk2tcJSHF`, commit `d60c4a9`.

Cost figures in the existing founder dashboard are estimates. They currently use
uncached token rates; interrupted requests may be absent. Provider billing is the
authoritative record, including discovery tool charges.
