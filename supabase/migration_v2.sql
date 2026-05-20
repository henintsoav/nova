-- ============================================================
-- NOVA — Migration v2 : Role-based calendar system
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- ── 1. Update profiles role constraint ──────────────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'member_lol', 'member_wr', 'member_valo',
    'coach_lol',  'coach_wr',  'coach_valo',
    'staff', 'member'
  ));

-- ── 2. Update handle_new_user trigger ────────────────────────
-- Reads selected role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_role TEXT;
BEGIN
  selected_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'member'
  );

  -- Validate role
  IF selected_role NOT IN (
    'member_lol', 'member_wr', 'member_valo',
    'coach_lol',  'coach_wr',  'coach_valo',
    'staff', 'member'
  ) THEN
    selected_role := 'member';
  END IF;

  INSERT INTO public.profiles (user_id, username, display_name, role)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    SPLIT_PART(NEW.email, '@', 1),
    selected_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. Weekly availability slots ────────────────────────────
CREATE TABLE IF NOT EXISTS public.weekly_slots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game         TEXT NOT NULL CHECK (game IN ('lol', 'wildrift', 'valorant')),
  day_of_week  INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon, 6=Sun
  hour         INT  NOT NULL CHECK (hour BETWEEN 0 AND 23),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, game, day_of_week, hour)
);

ALTER TABLE public.weekly_slots ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read slots (needed for aggregate view)
CREATE POLICY "weekly_slots_select"
  ON public.weekly_slots FOR SELECT TO authenticated USING (true);

-- Users can only manage their own slots
CREATE POLICY "weekly_slots_own_write"
  ON public.weekly_slots FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Scrim proposals ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scrim_proposals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game           TEXT NOT NULL CHECK (game IN ('lol', 'wildrift', 'valorant')),
  proposed_date  DATE NOT NULL,
  proposed_time  TIME NOT NULL,
  opponent       TEXT,
  format         TEXT NOT NULL DEFAULT 'bo1' CHECK (format IN ('bo1', 'bo3', 'bo5')),
  notes          TEXT,
  min_players    INT  NOT NULL DEFAULT 5,
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'confirmed', 'cancelled')),
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scrim_proposals ENABLE ROW LEVEL SECURITY;

-- Users can read proposals for their game
CREATE POLICY "proposals_select"
  ON public.scrim_proposals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role = 'staff'
        OR (p.role IN ('member_lol','coach_lol')   AND game = 'lol')
        OR (p.role IN ('member_wr', 'coach_wr')    AND game = 'wildrift')
        OR (p.role IN ('member_valo','coach_valo') AND game = 'valorant')
      )
    )
  );

-- Only coaches and staff can create proposals
CREATE POLICY "proposals_coach_insert"
  ON public.scrim_proposals FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (p.role LIKE 'coach_%' OR p.role = 'staff')
    )
  );

-- Coaches/staff can update their own proposals; staff can update any
CREATE POLICY "proposals_update"
  ON public.scrim_proposals FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'staff'
    )
  );

CREATE TRIGGER set_proposals_updated_at
  BEFORE UPDATE ON public.scrim_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. Proposal responses ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposal_responses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID REFERENCES public.scrim_proposals(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  response    TEXT NOT NULL CHECK (response IN ('accepted', 'declined')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proposal_id, user_id)
);

ALTER TABLE public.proposal_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "responses_select"
  ON public.proposal_responses FOR SELECT TO authenticated USING (true);

CREATE POLICY "responses_own_write"
  ON public.proposal_responses FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_responses_updated_at
  BEFORE UPDATE ON public.proposal_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
