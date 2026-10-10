# Shared SORP password-reset broker

Companion branches: `feat/sorp-password-recovery` in `mysocialimpact/cow` and `mysocialimpact/SORP2026`. Release Cow's additive migration, recovery code and verified sender first, then this broker, then the SORP UI. See Cow's `docs/password-recovery.md` for the exact rollout and rollback checklist.

This change preserves the existing account endpoint, `COW_GROWTH_EVENT_URL` and `COW_GROWTH_EVENT_KEY`. No secrets are duplicated and no MSI public pages are redesigned. Google sign-in remains unchanged/disabled on SORP.

- GET `?feature=password-reset` checks Cow's read-only capability; older/unconfigured backends yield `available:false`.
- POST `request-reset` accepts only email; `reset-password` accepts only token/password. The broker supplies a platform-header IP for persistent backend throttling and ignores client-supplied destinations, templates and service/session tokens.
- Recovery mutations require JSON, reject cross-origin browser requests, limit JSON payload size and are never automatically retried after a possible successful upstream write/send.
- Recovery responses expose only public status/message/error fields. Successful resets expire the old host-local session cookie; they do not automatically sign in.
- Existing signup/login/save/logout and session handling are otherwise unchanged.

Verification: eight mocked route tests pass using `node --experimental-strip-types --test tests/password-recovery.test.mjs`. Focused ESLint and TypeScript pass. Local `npm run vercel-build` was blocked by this cloud's Google Fonts network policy, not a changed font or source error; a Vercel preview build is used separately to validate the normal hosting environment. No real customer emails, passwords or production sessions were changed. Actual reset delivery requires the Cow deployment/sender prerequisites and an explicitly approved test recipient/account.
