-- ============================================================
-- NOVA — Migration v4b : Immediate founder role fix
-- Run in Supabase SQL Editor AFTER migration_v4.sql
-- ============================================================

-- ── 1. Backfill founder role for existing profiles ───────────
-- Matches via auth.users.email (profiles only store user_id).
UPDATE public.profiles
SET role = 'founder'
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'victoriaheny@gmail.com',
    'nielsmerieau@hotmail.fr',
    'peeeeachyy@gmail.com'
  )
);

-- ── 2. Tighten profiles_update_own — prevent role escalation ─
-- Users can update their own row (name, avatar…) but cannot
-- change their own role field — only founders can do that.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- role must stay the same as it is in the DB right now
    AND role = public.auth_role()
  );
