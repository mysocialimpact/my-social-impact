# UX simplification

The public header has one primary action, Upload a report, alongside Contact, My Reports and Log in (Account when authenticated). The mobile header retains a visible upload action and a compact menu. Registration is inside login. Account supports verification, password setup for legacy email-link identities, password recovery and logout.

## Canonical destinations

| Destination                                    | Behaviour                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/` / `/#upload`                               | One working 50 MB PDF uploader; on-home CTA scrolls and focuses without reloading  |
| `/review`                                      | Permanent redirect to `/#upload`                                                   |
| `/reviews`                                     | Personal document workspace, all three assessment states and actions               |
| `/login`                                       | Email/password login and inline registration; safe internal return destination     |
| `/account`                                     | Account details, verification and password/security actions                        |
| `/contact`                                     | Marcus's authentic photograph, credentials, email and working locations            |
| `/your-impact-director`                        | Home support; existing interest/review links retain their relevant service enquiry |
| `/methodology` and detailed methodology routes | Supporting professional documentation, retained URLs                               |

The homepage flows through uploader, three expandable assessment explanations, five expandable indicative support tiers, vision and contact. No secondary navigation strip remains. Public pages and My Reports have no permanent marketing bottom bar or reserved bottom padding. Active reviews retain their status tracker, Previous/Next and real next-action controls.

## Authentication and preservation

Uses the existing shared My Social Impact account service; passwords are never stored in this application's database. Password reset is proxied to that service. Existing email-link accounts keep access and can choose a password. Email ownership is established through the application's verified email proof, never by an unverified password account's address claim. Changing the shared account email invalidates old local verification.

Verified workspace migration preserves grants and retention across devices without duplicating subscriptions or resending historical reports. Report-specific email links grant that selected document only. Explicit account verification can adopt the guest workspace captured by its request. Unrelated saved identities are never merged. No destructive migration or change to assessment engines is required.

## Validation

Unit checks cover safe return destinations and existing scoring/security contracts. Validation-database integration covers source reuse, all frameworks, secure grants, email verification/delivery, PDFs, rate protections, old-account adoption, password-account proof and cross-device access. AI and email transports are mocked in database checks.

Browser checks cover six desktop/laptop/mobile/landscape sizes, uploader focus, browser history, disclosures, login/signup/error/logout, redirects, methodology deep links, recovery availability, axe checks, 105 learning screens and six saved-workspace layouts. Screenshots are retained as ignored local artifacts. Production smoke checks preserve historical scores and PDFs and do not send unsolicited customer communications.

Release gate: production build passed; 32 unit checks and all 23 validation-database checks passed. Public navigation passed at 1440, 1366, 1280, 390, 320 and 640-landscape widths; all 105 learning screens and six saved-workspace cases passed. Desktop and mobile contact/layout screenshots were inspected with images fully loaded.
