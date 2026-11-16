ALTER TABLE director.users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
-- Backfill only from explicit prior verification records, never from an email string alone.
UPDATE director.users u SET email_verified_at=COALESCE(
 (SELECT min(verified_at) FROM director.report_subscriptions s WHERE s.owner_id=u.id),
 (SELECT min(created_at) FROM director.access_sessions s WHERE s.owner_id=u.id AND s.kind='email')
) WHERE NOT u.is_anonymous AND u.email_verified_at IS NULL;
