-- ============================================================
-- NOVA — Migration v4 : Auth + Role assignment system
-- Run in Supabase SQL Editor AFTER migration_v3.sql
-- ============================================================

-- ── 1. Ensure 'founder' is in the role constraint ────────────
-- (already done in v3; this is a safe no-op if v3 was run)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'founder',
    'staff',
    'coach_lol', 'coach_wr', 'coach_valo',
    'member_lol', 'member_wr', 'member_valo',
    'member'
  ));

-- ── 2. Update handle_new_user: assign founder by email ───────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  -- Auto-assign founder role to specific emails
  IF NEW.email IN (
    'victoriaheny@gmail.com',
    'nielsmerieau@hotmail.fr',
    'peeeeachyy@gmail.com'
  ) THEN
    assigned_role := 'founder';
  ELSE
    -- All other users start as member; founders assign their role later
    assigned_role := 'member';
  END IF;

  INSERT INTO public.profiles (user_id, username, display_name, role)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    SPLIT_PART(NEW.email, '@', 1),
    assigned_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. SECURITY DEFINER helper — avoids recursive RLS ────────
-- Returns the role of the currently authenticated user.
-- SECURITY DEFINER bypasses RLS so no infinite recursion.
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- ── 4. Profiles RLS — founders can update any user's role ────
-- Drop the old own-only update policy and re-create it cleanly.
DROP POLICY IF EXISTS "profiles_update_own"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_founder_update"  ON public.profiles;

-- Users can update their own profile (display_name, avatar, etc.)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Founders can update any profile (used for role assignment)
CREATE POLICY "profiles_founder_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.auth_role() = 'founder');
