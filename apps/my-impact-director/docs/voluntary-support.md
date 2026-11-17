# Voluntary support payments

## Release status

Implemented, but public payments must remain **disabled** until The Ideas Shed's
existing Stripe merchant and actual Stripe test-mode journey are verified.
`CONTRIBUTIONS_ENABLED=false` is the safe deployment setting. Missing keys,
webhook secret, merchant name or account ID also hide the entire invitation.
There is no broken payment button, test card form or substitute payment link on
the public site.

The user authorised The Ideas Shed's existing Stripe account. No new Stripe
account, subscription, billing plan or real charge was created. Vercel lists
Stripe settings on the Ideas Shed project, but the connected environment tools
returned no usable secret values. The connected browser could not initialise.
The account's legal name, account ID, real test payments, receipt delivery and
webhook delivery therefore remain unverified. These are operational blockers,
not successful payment tests.

## Existing SORP implementation inspected

The actual `mysocialimpact/SORP2026` repository uses
`src/app/sorp-public-support-checkout.tsx` and `sorp-payment-amounts.ts`.
Stripe.js is loaded only after choosing to pay; `initEmbeddedCheckout` mounts
Stripe's secure UI, and completion calls a server status endpoint rather than
trusting the browser. A delayed confirmation has an explicit retry action.

Its `/api/sorp-payments/checkout` and `/status` handlers proxy to the existing MSI
backend. The inspected MSI backend forwards to Milkmaid's `/api/sorp-checkout`
and `/api/sorp-payment-status` with a product-bound service credential. That
service returned 403 from this environment; its payment-intent creation,
webhook signatures, merchant, refund administration and receipt configuration
could not be independently inspected. Its service key, hard-coded publishable
key and webhook secret were not copied into My Impact Director.

This feature reuses the same supported Stripe Embedded Checkout architecture,
lazy loading, server confirmation and recovery patterns. App-owned route
handlers call the **existing authorised Stripe account** directly, with
My Impact Director metadata and a dedicated webhook; no additional external
payment service is introduced and SORP's payment processing is unchanged.

## Behaviour and controls

- The invitation follows results and professional-service offers for all three
  assessments. It never gates findings, downloads, email or review generation.
- One-off GBP contributions: £5, £10, £20 or custom. Exact integer pence,
  minimum £1, default maximum £1,000, configurable maximum £10,000. Browser and
  server share amount parsing; the server enforces the actual configured cap.
- The same report's invitation collapses after the first display in a browser
  session. Account or proven guest aliases with an unrefunded contribution in
  the preceding 90 days see a short acknowledgement instead.
- Stripe owns the payment fields; the app never handles card data. A verified
  email is supplied only for checkout/receipts. Otherwise Checkout collects its
  required receipt details. There is no marketing opt-in or Gift Aid.
- The server verifies the configured account against Stripe `/v1/account`,
  checks charges are enabled and retrieves the merchant's legal/business name.
  The account, mode, amount, currency, product, purpose and contribution ID must
  match before accepting a session or publishing success.
- Payment creation has an owner lock, persistent attempt UUID and stable Stripe
  idempotency key. An interrupted response retries the same attempt. An active
  payment must be resumed or explicitly expired before changing the amount.
- Completion and status checks retrieve current Stripe session/payment-intent
  state, including the latest charge's refunded amount. Browser completion alone
  cannot publish success. Cancellation expires an open Checkout session;
  processing payments remain pending rather than inviting a duplicate charge.
- Webhooks require the unchanged raw body, Stripe v1 HMAC signature, five-minute
  timestamp tolerance, expected environment/account and a bounded body. Event
  IDs are deduplicated transactionally. Provider/DB failures return non-2xx so
  Stripe can retry; duplicate and out-of-order events cannot erase refunds or
  downgrade a confirmed successful payment to pending.
- Turning off new contributions still permits configured status and webhook
  reconciliation. Test keys cannot accept public production payments; live keys
  cannot run in preview/development.
- Private ledger records retain amounts/status/Stripe references for accounting;
  deleting a report removes its links without deleting payment records. Founder
  access is required. Live and test totals are separate, and figures distinguish
  gross contributions, refunds and net-before-Stripe-fees. Stripe remains the
  authoritative settlement/refund record; this is not a separate accounting
  system. No financial tax treatment is inferred or configured.

## Configuration and activation

Use the existing **Ideas Shed** Stripe account, not an automatically selected
SORP or newly provisioned merchant. Store keys securely in the My Impact
Director Vercel project; never in chat, Git, public variables or logs.

Required server variables:

```
CONTRIBUTIONS_ENABLED=false
CONTRIBUTIONS_MERCHANT_NAME=<approved receiving business display name>
CONTRIBUTIONS_STRIPE_ACCOUNT_ID=acct_...
CONTRIBUTIONS_MAX_PENCE=100000
STRIPE_SECRET_KEY=<environment-specific secret>
STRIPE_PUBLISHABLE_KEY=<matching environment/account publishable key>
STRIPE_WEBHOOK_SECRET=<this endpoint's signing secret>
```

Preview uses matching test keys and production uses matching live keys. Create
an app-specific endpoint in each Stripe environment for:

`https://www.myimpactdirector.com/api/contributions/webhook`

For test mode, use Stripe CLI forwarding to the local app or a test preview
webhook endpoint that Stripe can actually reach. A Vercel-auth-protected preview
will reject Stripe delivery unless a deliberate endpoint access arrangement is
configured; do not disable protection on the rest of the preview. Do not reuse
another endpoint's signing secret. Configure only these events:

```
checkout.session.completed
checkout.session.expired
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
payment_intent.payment_failed
charge.refunded
refund.created
refund.updated
refund.failed
```

Before enabling live acceptance: confirm the receiving legal entity, descriptor,
receipt business details and applicable treatment with the existing approved
merchant information; enable/check Stripe's supported payment receipts; run
real **test-mode only** successful/declined/abandoned payments, a delayed/retried
webhook and partial/full refunds; reconcile test records with founder totals.
No live charge is needed. Only then set `CONTRIBUTIONS_ENABLED=true` for
production and deploy. No other product's keys or webhook settings need change.

## Validation evidence

- `tests/contributions.test.ts`: amounts, modes and fail-closed configuration,
  exact-body signature verification, stale/future/rotated signatures and
  authoritative status/refund classification.
- `tests/contributions-integration.test.ts`: real validation database with a
  **simulated Stripe contract**, concurrent/idempotent creation, lost response,
  amount/ownership checks, pending/confirmed states, webhook delivery failure
  and retry, duplicate events, partial/full refunds, founder restrictions and
  totals, guest email privacy and payment preservation after report deletion.
- `scripts/qa-contributions.mjs`: browser contract tests on all three review
  types at 1366×768, 1440×900, 1920×1080, 390×844 and 320×640. Inspects preset and
  custom amounts, inline mount, pending verification, cancellation, confirmation,
  repeat suppression, disabled feature, processing exclusion, no eager Stripe
  requests and targeted automated accessibility checks. Screenshots are saved
  privately under `artifacts/support/browser/`.

These browser tests deliberately inject a labelled Stripe UI fixture. They do
**not** establish that a real Stripe test card, receipt or webhook has succeeded.
Keep public acceptance off until those checks are genuinely complete.
