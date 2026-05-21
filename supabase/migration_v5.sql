-- ============================================================
-- NOVA — Migration v5 : Pseudo + Roster system
-- Run in Supabase SQL Editor AFTER migration_v4b.sql
-- ============================================================

-- ── 1. Add pseudo column to profiles ─────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pseudo TEXT;

-- ── 2. Roster members table ───────────────────────────────────
-- References profiles.id (not auth.users.id) for PostgREST joins.
CREATE TABLE IF NOT EXISTS public.roster_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game       TEXT NOT NULL CHECK (game IN ('lol', 'wildrift', 'valorant')),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position   TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game, profile_id)
);

-- ── 3. RLS for roster_members ─────────────────────────────────
ALTER TABLE public.roster_members ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can view rosters (public info)
CREATE POLICY "roster_select_public" ON public.roster_members
  FOR SELECT USING (true);

-- Coaches can manage their own game's roster; staff & founder manage all
CREATE POLICY "roster_manage" ON public.roster_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'founder'
          OR p.role = 'staff'
          OR (p.role = 'coach_lol'  AND game = 'lol')
          OR (p.role = 'coach_wr'   AND game = 'wildrift')
          OR (p.role = 'coach_valo' AND game = 'valorant')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.role = 'founder'
          OR p.role = 'staff'
          OR (p.role = 'coach_lol'  AND game = 'lol')
          OR (p.role = 'coach_wr'   AND game = 'wildrift')
          OR (p.role = 'coach_valo' AND game = 'valorant')
        )
    )
  );
