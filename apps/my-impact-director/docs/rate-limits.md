# Review access and abuse protection

Anonymous review requires no registration. A guest's HttpOnly `mid_access` cookie identifies their workspace; a verified account has its own owner ID. Incognito starts a new guest but normally shares the same public IP.

## Upload access

- Guest creation: 300 new guest sessions per shared network per hour (`visitor-v2`). Existing sessions are reused without charging this bucket.
- Upload/discovery-confirm starts: 120 per shared network per hour for anonymous visitors (`upload-network-v2`), and 30 per owner per hour (`upload-attempt-v2`). These are request/abuse limits, not free-review allowances. All three ingestion routes use the same protection.
- Chunk transfer: bounded 3 MB chunks, max 50 MB per file, authenticated to the private owner. Upload completion requests have a separate 30/hour owner limit. Retrying a completed transfer returns the same review.
- Network buckets use an HMAC of the UTC date and first forwarded IP. No raw IP is stored. These hourly buckets also rotate at UTC midnight. Different people on one network share only the high-volume abuse protection.

## Review allowance

- Three successfully assessed source reports per owner in a rolling 24 hours. The first completed framework charges a source report once; its other frameworks and retries do not add charges.
- `director.completed_reports` records successful reports in the same transaction that publishes their result. Failed assessments, invalid PDFs, incomplete uploads and preparation alone do not consume this allowance. Deleting a report preserves its successful-review charge.
- At most three unfinished source reports actively processing per owner, independent of the daily allowance. Failed jobs and jobs inactive for an hour do not reserve this capacity. Duplicate uploads are checked before quota enforcement and rechecked under an owner advisory lock.
- Up to 20 retained, unexpired source reports per owner is a separate storage limit, with an explicit Saved reports recovery message.

## Other protection

Existing global processing limits remain: 240 stage attempts/24h, $20 total AI spend/24h, $4 per assessment, bounded retries and provider backoff. These are service budgets, not an IP or visitor's upload allowance. Discovery searches have separate network/owner/global limits. Email and feedback have separate request limits.

## Diagnosis and restoration (16 November 2026)

The old `anonymous-upload` bucket allowed only **three upload starts per public IP per 24h**. It was charged before transfer or review success; abandoned uploads and rejected retries also incremented it. A new Incognito guest therefore inherited the same exhausted network allowance. Production reproduction returned 429 at `POST /api/uploads` in both the current and a fresh browser session, with no PDF transferred. The identified bucket rose from 1 to 7 across the diagnostic requests, including rejected starts. The separate global AI counter was 166/240 and spend $1.363893/$20, so those were not causing this upload rejection.

The old owner `new-report` counter also charged attempts before the report transaction, and retained-report daily counts included failures. These have been replaced by the successful-report ledger. Versioned request-policy keys immediately retire stale network/owner attempt lockouts without clearing successful usage or unrelated protections. Rejected request limits no longer increase their counter or extend its expiry.

Request-limit rejections now log a policy name, pseudonymous bucket, threshold and retry interval, without raw IPs, emails or cookies. Request-limit HTTP 429 responses include Retry-After and no-store. Upload errors retain the existing apology and working feedback link.
