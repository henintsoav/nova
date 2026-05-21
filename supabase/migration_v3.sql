-- ============================================================
-- NOVA — Migration v3 : Results system + RLS policy fix
-- Run in Supabase SQL Editor AFTER migration_v2.sql
-- ============================================================

-- ── 1. Add 'founder' to profiles role constraint ─────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'founder',
    'member_lol', 'member_wr', 'member_valo',
    'coach_lol',  'coach_wr',  'coach_valo',
    'staff', 'member'
  ));

-- ── 2. Add result detail columns to scrims ───────────────────
ALTER TABLE public.scrims
  ADD COLUMN IF NOT EXISTS result          TEXT CHECK (result IN ('win', 'loss')),
  ADD COLUMN IF NOT EXISTS duration        TEXT,
  ADD COLUMN IF NOT EXISTS players_present TEXT,
  ADD COLUMN IF NOT EXISTS champions       TEXT,
  ADD COLUMN IF NOT EXISTS coach_note      TEXT;

-- ── 3. Fix scrims RLS policies (were broken: used role='admin')
DROP POLICY IF EXISTS "scrims_admin_insert" ON public.scrims;
DROP POLICY IF EXISTS "scrims_admin_update" ON public.scrims;
DROP POLICY IF EXISTS "scrims_admin_delete" ON public.scrims;

-- Insert: coach, staff, founder
CREATE POLICY "scrims_staff_insert" ON public.scrims
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.role LIKE 'coach_%' OR p.role IN ('staff', 'founder'))
    )
  );

-- Update: coach, staff, founder
CREATE POLICY "scrims_staff_update" ON public.scrims
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.role LIKE 'coach_%' OR p.role IN ('staff', 'founder'))
    )
  );

-- Delete: staff, founder only (not coaches)
CREATE POLICY "scrims_staff_delete" ON public.scrims
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('staff', 'founder')
    )
  );
