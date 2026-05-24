-- ============================================================
-- NOVA — Migration v8 : Weekly scrim reset via pg_cron
-- Run in Supabase SQL Editor AFTER migration_v7.sql
--
-- ⚠️  pg_cron is available on Supabase Pro / Team plans.
--     On the Free plan, use the GitHub Actions alternative
--     documented at the bottom of this file.
-- ============================================================

-- ── 1. Reset function ─────────────────────────────────────────
-- Deletes weekly data while preserving completed match history.
-- Safe to call manually at any time (idempotent).

CREATE OR REPLACE FUNCTION public.reset_weekly_scrims()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slots_deleted     INTEGER;
  proposals_deleted INTEGER;
  scrims_deleted    INTEGER;
BEGIN
  -- 1. Clear all weekly availability slots
  DELETE FROM public.weekly_slots;
  GET DIAGNOSTICS slots_deleted = ROW_COUNT;

  -- 2. Clear all proposals + their responses
  --    (proposal_responses CASCADE-deletes automatically)
  DELETE FROM public.scrim_proposals;
  GET DIAGNOSTICS proposals_deleted = ROW_COUNT;

  -- 3. Remove only future / unplayed scrims.
  --    PROTECTED: status = 'completed' OR result IS NOT NULL (win/loss recorded)
  DELETE FROM public.scrims
  WHERE status != 'completed'
    AND result IS NULL;
  GET DIAGNOSTICS scrims_deleted = ROW_COUNT;

  RETURN format(
    'Weekly reset at %s — slots: %s, proposals: %s, scrims: %s',
    NOW()::TEXT,
    slots_deleted,
    proposals_deleted,
    scrims_deleted
  );
END;
$$;

-- ── 2. Schedule with pg_cron ──────────────────────────────────
-- Every Sunday at 23:59 UTC.
--
-- France timezone offset:
--   Winter CET  (UTC+1) → '59 22 * * 0'  (= 23:59 Paris)
--   Summer CEST (UTC+2) → '59 21 * * 0'  (= 23:59 Paris)
--
-- Change the hour in the cron expression below to match your timezone.

SELECT cron.schedule(
  'nova-weekly-scrim-reset',   -- job name (unique)
  '59 22 * * 0',               -- Sunday 23:59 CET (UTC+1)
  'SELECT public.reset_weekly_scrims()'
);

-- ── 3. Verify the job was registered ─────────────────────────
-- Run this SELECT after executing the migration to confirm:
--   SELECT jobid, jobname, schedule, command, active
--   FROM cron.job
--   WHERE jobname = 'nova-weekly-scrim-reset';

-- ── 4. Manual test ────────────────────────────────────────────
-- To trigger a reset manually at any time (e.g. to test):
--   SELECT public.reset_weekly_scrims();

-- ── 5. Disable / remove the job if needed ────────────────────
--   SELECT cron.unschedule('nova-weekly-scrim-reset');

-- ============================================================
-- FREE PLAN ALTERNATIVE (no pg_cron)
-- ============================================================
-- If you are on the Supabase Free plan, create a GitHub Actions
-- workflow that calls the reset function via the Supabase REST API
-- every Sunday at 23:59:
--
-- File: .github/workflows/weekly-reset.yml
-- ─────────────────────────────────────────
-- name: Weekly scrim reset
-- on:
--   schedule:
--     - cron: '59 22 * * 0'   # Sunday 23:59 CET
-- jobs:
--   reset:
--     runs-on: ubuntu-latest
--     steps:
--       - name: Call reset function
--         run: |
--           curl -s -X POST \
--             "${{ secrets.SUPABASE_URL }}/rest/v1/rpc/reset_weekly_scrims" \
--             -H "apikey: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
--             -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
--             -H "Content-Type: application/json"
--
-- Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as GitHub secrets.
-- ============================================================
