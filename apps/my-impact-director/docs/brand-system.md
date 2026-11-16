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

The primary navigation is Contact, My Reports, Log in (Account when signed in) and Upload a report. The logo returns home. Registration sits inside the conventional email/password login experience; Account provides verification, password setup for existing email-link users, password recovery and logout.

There is no secondary section strip. Upload a report always opens the homepage uploader without reloading the homepage. `/review` permanently redirects to `/#upload`; `/your-impact-director` redirects to homepage support or preserves existing service enquiries. The three homepage assessment disclosures link to the full professional methodologies. Five expandable indicative pricing tiers retain the human-led proposition without a duplicate marketing page.

The header remains visible on desktop and mobile. Mobile keeps the brand, upload action and a compact menu. Browser history, reduced motion and keyboard focus are preserved. Marketing pages have no persistent bottom action bar or reserved bottom padding. Active review pages retain their compact status tracker, educational controls and contextual next action.

## The Impact Edit and historical reports

Visitor-facing labels, selection, learning, results, dashboard, administration, PDF and requested-email delivery use The Impact Edit. The formal attribution is “An Impact Report Excellence assessment developed by My Social Impact.” Detailed methodology documentation remains Impact Report Excellence Methodology v1.0 at its existing stable URL.

Creative results are labelled “Indicative Creative Assessment” and explain that creative judgements are partly subjective. Actual visual inspection, five pillars, 25 criteria, scoring/coverage rules and evidence validation are preserved. The internal `report` framework identifier, methodology version, original stored scores, reports, grants and subscriptions are unchanged. Historical reviews remain accessible; regenerated PDFs receive the current identity and retain their original methodology version.

## Verification

Run `npm test`, `npm run test:database`, `npm run build`, `node scripts/qa-brand-navigation.mjs <origin>` and `node scripts/qa-workspace.mjs <origin>`. The navigation test covers the single public header, uploader focus, disclosures, redirects, history, mobile menus, login/signup/logout, recovery and axe checks. Workspace contracts cover all three learning journeys across laptop, desktop, phone and landscape sizes. Database contracts cover third-framework analysis, unchanged source reuse/scoring, privacy, verified accounts, PDF content and requested email delivery. Email transport and AI are mocked only in validation-database tests; no customer emails are sent by these checks.

Release verification is recorded in `docs/ux-simplification.md`. Production checks preserve existing scores and private reports and do not send unsolicited customer communications.
