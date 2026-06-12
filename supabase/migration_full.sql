-- ============================================================
-- AXWELD — Migration complète (schema + v2 → v13)
-- À exécuter dans Supabase SQL Editor sur une base vierge.
-- ⚠️  Exécuter en une seule fois dans l'ordre indiqué.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Fonctions utilitaires ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Profiles ──────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID        REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username             TEXT        UNIQUE,
  display_name         TEXT,
  pseudo               TEXT,
  avatar_url           TEXT        DEFAULT NULL,
  banner_url           TEXT        DEFAULT NULL,
  accent_color         TEXT        DEFAULT NULL,
  availability_status  TEXT        DEFAULT 'vacation',
  role                 TEXT        NOT NULL DEFAULT 'member'
    CHECK (role IN (
      'founder', 'staff',
      'coach_lol', 'coach_wr', 'coach_valo',
      'member_lol', 'member_wr', 'member_valo',
      'member'
    )),
  is_deleted           BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at           TIMESTAMPTZ,
  gdpr_consent         BOOLEAN     NOT NULL DEFAULT FALSE,
  gdpr_consent_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_deleted_idx
  ON public.profiles (deleted_at) WHERE is_deleted = TRUE;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = public.auth_role()
  );

CREATE POLICY profiles_soft_delete_own ON public.profiles
  FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_deleted = TRUE
    AND role = public.auth_role()
  );

CREATE POLICY profiles_founder_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.auth_role() = 'founder');

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Fonction auth_role ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- ── Trigger handle_new_user ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  assigned_role TEXT;
  consent       BOOLEAN;
  user_name     TEXT;
  avatar        TEXT;
BEGIN
  IF NEW.email IN ('victoriaheny@gmail.com', 'peeeeachyy@gmail.com') THEN
    assigned_role := 'founder';
  ELSE
    assigned_role := 'member';
  END IF;

  IF COALESCE(NEW.app_metadata->>'provider', 'email') = 'email' THEN
    consent := COALESCE((NEW.raw_user_meta_data->>'gdpr_consent')::BOOLEAN, FALSE);
  ELSE
    consent := TRUE;
  END IF;

  user_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'user_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1)
  );

  avatar := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.profiles (
    user_id, username, display_name, role,
    gdpr_consent, gdpr_consent_at, avatar_url
  )
  VALUES (
    NEW.id, user_name, user_name, assigned_role,
    consent,
    CASE WHEN consent THEN NOW() ELSE NULL END,
    avatar
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Scrims ────────────────────────────────────────────────────
CREATE TABLE public.scrims (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT        NOT NULL,
  game             TEXT        NOT NULL CHECK (game IN ('lol', 'wildrift', 'valorant')),
  date             DATE        NOT NULL,
  time             TIME        NOT NULL,
  opponent         TEXT,
  format           TEXT        NOT NULL DEFAULT 'bo1' CHECK (format IN ('bo1', 'bo3', 'bo5')),
  status           TEXT        NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  notes            TEXT,
  result           TEXT        CHECK (result IN ('win', 'loss')),
  duration         TEXT,
  players_present  TEXT,
  champions        TEXT,
  coach_note       TEXT,
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scrims ENABLE ROW LEVEL SECURITY;

CREATE POLICY scrims_select ON public.scrims
  FOR SELECT TO authenticated USING (true);

CREATE POLICY scrims_staff_insert ON public.scrims
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.role LIKE 'coach_%' OR p.role IN ('staff', 'founder'))
  ));

CREATE POLICY scrims_staff_update ON public.scrims
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.role LIKE 'coach_%' OR p.role IN ('staff', 'founder'))
  ));

CREATE POLICY scrims_staff_delete ON public.scrims
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role IN ('staff', 'founder')
  ));

CREATE TRIGGER set_scrims_updated_at
  BEFORE UPDATE ON public.scrims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Weekly slots ──────────────────────────────────────────────
CREATE TABLE public.weekly_slots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game         TEXT NOT NULL CHECK (game IN ('lol', 'wildrift', 'valorant')),
  day_of_week  INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  hour         INT  NOT NULL CHECK (hour BETWEEN 0 AND 23),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, game, day_of_week, hour)
);

ALTER TABLE public.weekly_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY weekly_slots_select ON public.weekly_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY weekly_slots_own_write ON public.weekly_slots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Scrim proposals ───────────────────────────────────────────
CREATE TABLE public.scrim_proposals (
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

CREATE POLICY proposals_select ON public.scrim_proposals
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (
        p.role = 'founder'
        OR p.role = 'staff'
        OR (p.role = ANY(ARRAY['member_lol','coach_lol'])   AND scrim_proposals.game = 'lol')
        OR (p.role = ANY(ARRAY['member_wr','coach_wr'])     AND scrim_proposals.game = 'wildrift')
        OR (p.role = ANY(ARRAY['member_valo','coach_valo']) AND scrim_proposals.game = 'valorant')
      )
  ));

CREATE POLICY proposals_coach_insert ON public.scrim_proposals
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.role LIKE 'coach_%' OR p.role IN ('staff', 'founder'))
  ));

CREATE POLICY proposals_update ON public.scrim_proposals
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('staff', 'founder')
    )
  );

CREATE TRIGGER set_proposals_updated_at
  BEFORE UPDATE ON public.scrim_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Proposal responses ────────────────────────────────────────
CREATE TABLE public.proposal_responses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID REFERENCES public.scrim_proposals(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  response    TEXT NOT NULL CHECK (response IN ('accepted', 'declined')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proposal_id, user_id)
);

ALTER TABLE public.proposal_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY responses_select ON public.proposal_responses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY responses_own_write ON public.proposal_responses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_responses_updated_at
  BEFORE UPDATE ON public.proposal_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Roster members ────────────────────────────────────────────
CREATE TABLE public.roster_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game       TEXT NOT NULL CHECK (game IN ('lol', 'wildrift', 'valorant')),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position   TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game, profile_id)
);

ALTER TABLE public.roster_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY roster_select_public ON public.roster_members
  FOR SELECT USING (true);

CREATE POLICY roster_manage ON public.roster_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (
        p.role = 'founder' OR p.role = 'staff'
        OR (p.role = 'coach_lol'  AND game = 'lol')
        OR (p.role = 'coach_wr'   AND game = 'wildrift')
        OR (p.role = 'coach_valo' AND game = 'valorant')
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (
        p.role = 'founder' OR p.role = 'staff'
        OR (p.role = 'coach_lol'  AND game = 'lol')
        OR (p.role = 'coach_wr'   AND game = 'wildrift')
        OR (p.role = 'coach_valo' AND game = 'valorant')
      )
  ));

-- ── Join requests ─────────────────────────────────────────────
CREATE TABLE public.join_requests (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom        TEXT NOT NULL,
  prenom     TEXT NOT NULL,
  discord    TEXT NOT NULL,
  section    TEXT NOT NULL CHECK (section IN ('esport', 'audiovisuel', 'evenementiel')),
  game       TEXT CHECK (game IN ('lol', 'wildrift', 'valorant')),
  role       TEXT CHECK (role IN ('joueur', 'coach', 'manager')),
  message    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY join_insert_public ON public.join_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY join_select_staff ON public.join_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role IN ('founder', 'staff')
  ));

-- ── Fonctions scrims ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_weekly_scrims()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  slots_deleted     INTEGER;
  proposals_deleted INTEGER;
  scrims_deleted    INTEGER;
BEGIN
  DELETE FROM public.weekly_slots;
  GET DIAGNOSTICS slots_deleted = ROW_COUNT;

  DELETE FROM public.scrim_proposals;
  GET DIAGNOSTICS proposals_deleted = ROW_COUNT;

  DELETE FROM public.scrims WHERE status != 'completed';
  GET DIAGNOSTICS scrims_deleted = ROW_COUNT;

  RETURN format(
    'Weekly reset at %s — slots: %s, proposals: %s, scrims: %s',
    NOW()::TEXT, slots_deleted, proposals_deleted, scrims_deleted
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_scrims_starting_soon()
RETURNS TABLE(
  id         uuid, title text, game text,
  date       date, scrim_time time, opponent text, format text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, title, game, date, time AS scrim_time, opponent, format
  FROM public.scrims
  WHERE status = 'confirmed'
    AND (date::text || ' ' || time::text)::timestamp AT TIME ZONE 'Europe/Paris'
        BETWEEN NOW() + INTERVAL '50 minutes'
        AND     NOW() + INTERVAL '70 minutes';
$$;

-- ── Anonymisation comptes supprimés ──────────────────────────
CREATE OR REPLACE FUNCTION public.anonymize_deleted_accounts()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected INTEGER;
BEGIN
  UPDATE public.profiles
  SET pseudo = NULL, display_name = '[supprimé]'
  WHERE is_deleted = TRUE
    AND deleted_at < NOW() - INTERVAL '30 days'
    AND (pseudo IS NOT NULL OR display_name IS DISTINCT FROM '[supprimé]');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ── Recruitment status ────────────────────────────────────────
CREATE TABLE public.recruitment_status (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game       TEXT NOT NULL UNIQUE,
  is_open    BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.recruitment_status (game, is_open) VALUES
  ('lol', false), ('wildrift', false), ('valorant', false),
  ('audio', false), ('event', false)
ON CONFLICT (game) DO NOTHING;

ALTER TABLE public.recruitment_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY recruit_read_public ON public.recruitment_status
  FOR SELECT USING (true);

CREATE POLICY recruit_update_staff ON public.recruitment_status
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('founder', 'staff')
  ));

-- ── News posts ────────────────────────────────────────────────
CREATE TABLE public.news_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'annonce',
  published  BOOLEAN NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY news_read_public ON public.news_posts
  FOR SELECT USING (published = true);

CREATE POLICY news_all_staff ON public.news_posts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('founder', 'staff')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('founder', 'staff')
  ));

-- ── Availability table (legacy, kept for compatibility) ───────
CREATE TABLE IF NOT EXISTS public.availability (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scrim_id   UUID REFERENCES public.scrims(id) ON DELETE CASCADE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'unavailable', 'maybe')),
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, scrim_id)
);

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY availability_select ON public.availability
  FOR SELECT TO authenticated USING (true);

CREATE POLICY availability_manage_own ON public.availability
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Backfill fondateurs existants ────────────────────────────
-- À adapter avec les emails réels des fondateurs si nécessaire.
-- UPDATE public.profiles SET role = 'founder'
-- WHERE user_id IN (
--   SELECT id FROM auth.users
--   WHERE email IN ('victoriaheny@gmail.com', 'peeeeachyy@gmail.com')
-- );

-- ============================================================
-- ✅ Migration complète terminée.
-- N'oublie pas de créer le bucket Storage "banners" (public)
-- avec les 3 policies INSERT/SELECT/UPDATE dans le dashboard.
-- ============================================================
