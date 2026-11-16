# My Impact Director — identity and navigation

The primary identity is a bold, outlined DM Sans wordmark: navy MY IMPACT, orange DIRECTOR and a square full stop. The compact MID mark uses a white editorial slash. The Impact Edit combines heavy editorial lettering, an orange dry-brush cut, overspray and a hot-pink underline. All paint, typography and monogram artwork is vector-based and editable.

## Source and assets

Regenerate with `node scripts/build-brand.mjs`. The generator contains the editable wording, glyph layout, paths, original brush artwork and palette. SVG lettering is outlined so rendering never depends on an installed font. DM Sans is licensed under SIL OFL 1.1; the licence is in `assets/brand/DM-Sans-OFL.txt`. PNG exports support PDF delivery. My Social Impact and The Ideas Shed identities are unchanged.

All logo assets live in `public/brand/`, with SVG source and matching PNG exports:

| Identity           | Formats                                                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| My Impact Director | `my-impact-director-primary`, `my-impact-director-horizontal`, `my-impact-director-symbol`, `my-impact-director-light`, `my-impact-director-dark`, `my-impact-director-mono` |
| The Impact Edit    | `the-impact-edit-primary`, `the-impact-edit-horizontal`, `the-impact-edit-symbol`, `the-impact-edit-light`, `the-impact-edit-dark`, `the-impact-edit-mono`                   |

The main application uses the horizontal SVG. PDF reports use the corresponding raster wordmark. `src/app/icon.svg` is the application favicon; `public/favicon.svg` is a stable public copy. Legacy Impact Report Excellence asset URLs remain available and carry the new artwork.

## Navigation hierarchy

The permanent primary navigation links to stable pages: Home, Review a Report (`/review`), Methodology, Your Impact Director, Contact (`/contact`) and My Reports (`/reviews`). LOGIN remains a visible separate action linking directly to the passwordless form. Selected page links have an orange marker and `aria-current="page"`. On mobile, the menu control also names the current page.

A separate navy strip provides section links for Home, Methodology, the detailed Impact Report Excellence methodology and Your Impact Director. `src/lib/navigation.ts` defines the routes and their actual section IDs. The strip uses `aria-current="location"`, IntersectionObserver and measured sticky-bar geometry. A bounded end-of-document correction handles short final sections that cannot reach the observation band. The active mobile section scrolls into view within the strip without moving the page horizontally.

Anchors preserve meaningful hashes, browser history and reduced-motion preferences. Clicking a section moves keyboard focus to its target. Header and section heights are measured; anchor padding keeps headings visible. Contact and My Reports do not show irrelevant marketing section links. Review pages retain their existing live status tracker as the contextual workflow navigation, without a duplicate strip. Educational steps and the persistent bottom action bar remain separate controls.

The existing bottom bar retains its true review-state actions. On the ongoing-support page, its primary action opens the service enquiry instead of a report upload.

## The Impact Edit and historical reports

Visitor-facing labels, selection, learning, results, dashboard, administration, PDF and requested-email delivery use The Impact Edit. The formal attribution is “An Impact Report Excellence assessment developed by My Social Impact.” Detailed methodology documentation remains Impact Report Excellence Methodology v1.0 at its existing stable URL.

Creative results are labelled “Indicative Creative Assessment” and explain that creative judgements are partly subjective. Actual visual inspection, five pillars, 25 criteria, scoring/coverage rules and evidence validation are preserved. The internal `report` framework identifier, methodology version, original stored scores, reports, grants and subscriptions are unchanged. Historical reviews remain accessible; regenerated PDFs receive the current identity and retain their original methodology version.

## Verification

Run `npm test`, `npm run test:database`, `npm run build`, `node scripts/qa-brand-navigation.mjs <origin>` and `node scripts/qa-workspace.mjs <origin>`. The navigation test covers page and section state, native scrolling, direct hashes, history, mobile menus, login, sticky geometry and tested axe checks. Workspace contracts cover all three learning journeys across laptop, desktop, phone and landscape sizes. Database contracts cover third-framework analysis, unchanged source reuse/scoring, privacy, verified accounts, PDF content and requested email delivery. Email transport and AI are mocked only in validation-database tests; no customer emails are sent by these checks.

Latest release checks: 31 unit checks and 22 real validation-database checks passed, including a branded third-assessment PDF and a requested delivery through the mocked email transport. Visual inspection includes the wordmarks, expressive primary/horizontal/compact marks, desktop marketing pages and mobile layouts. The production verification checks existing private workspaces and regenerates existing PDFs; it does not rescore historical records or email customers.
