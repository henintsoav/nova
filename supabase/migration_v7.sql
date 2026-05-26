-- ============================================================
-- NOVA — Migration v7 : Soft delete for user accounts
-- Run in Supabase SQL Editor AFTER migration_v6.sql
-- ============================================================

-- ── 1. Add soft-delete columns to profiles ───────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS profiles_deleted_idx
  ON public.profiles (deleted_at)
  WHERE is_deleted = TRUE;

-- ── 2. Allow authenticated users to soft-delete their own row ─
-- The existing profiles_update_own policy already allows users to
-- update their own row (WITH CHECK role = current role).
-- We need a separate policy for the is_deleted flag only.
DROP POLICY IF EXISTS "profiles_soft_delete_own" ON public.profiles;
CREATE POLICY "profiles_soft_delete_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_deleted = TRUE          -- can only flip to deleted, not back
    AND role = public.auth_role()  -- cannot change role at the same time
  );

-- ── 3. Anonymization function (run after 30-day grace period) ─
-- Call manually or schedule via pg_cron (if enabled on your plan).
-- Removes personal identifiers; keeps the row for analytics/audit.
CREATE OR REPLACE FUNCTION public.anonymize_deleted_accounts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.profiles
  SET
    pseudo       = NULL,
    display_name = '[supprimé]'
  WHERE
    is_deleted = TRUE
    AND deleted_at < NOW() - INTERVAL '30 days'
    AND (pseudo IS NOT NULL OR display_name IS DISTINCT FROM '[supprimé]');

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ── 4. Optional pg_cron schedule (uncomment if pg_cron is enabled) ──
-- Runs at 03:00 on the 1st of every month.
-- SELECT cron.schedule(
--   'nova-anonymize-deleted-accounts',
--   '0 3 1 * *',
--   'SELECT public.anonymize_deleted_accounts()'
-- );

-- ── Notes ──────────────────────────────────────────────────────
-- Hard deletion from auth.users requires the Supabase service-role
-- key (not available client-side). To fully purge a user after 30
-- days, call the Admin API from a trusted server or Edge Function:
--   await supabase.auth.admin.deleteUser(userId)
-- For now, the anonymize function removes PII from the profiles
-- table. The auth.users row remains but the account is blocked at
-- the application layer (is_deleted flag checked on every login).
