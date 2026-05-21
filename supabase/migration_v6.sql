-- ============================================================
-- NOVA — Migration v6 : Join requests
-- Run in Supabase SQL Editor AFTER migration_v5.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.join_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         TEXT NOT NULL,
  prenom      TEXT NOT NULL,
  discord     TEXT NOT NULL,
  section     TEXT NOT NULL CHECK (section IN ('esport', 'audiovisuel', 'evenementiel')),
  game        TEXT CHECK (game IN ('lol', 'wildrift', 'valorant')),
  role        TEXT CHECK (role IN ('joueur', 'coach', 'manager')),
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous included) can submit a join request
CREATE POLICY "join_insert_public" ON public.join_requests
  FOR INSERT WITH CHECK (true);

-- Only founders and staff can read submissions
CREATE POLICY "join_select_staff" ON public.join_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('founder', 'staff')
    )
  );
