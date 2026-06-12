-- migration_v13: recruitment status + news posts

-- ── Recruitment status ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recruitment_status (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game       TEXT NOT NULL UNIQUE, -- lol | wildrift | valorant | audio | event
  is_open    BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default entries
INSERT INTO public.recruitment_status (game, is_open) VALUES
  ('lol',      false),
  ('wildrift', false),
  ('valorant', false),
  ('audio',    false),
  ('event',    false)
ON CONFLICT (game) DO NOTHING;

-- RLS
ALTER TABLE public.recruitment_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY recruit_read_public ON public.recruitment_status
  FOR SELECT USING (true);

CREATE POLICY recruit_update_staff ON public.recruitment_status
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
      AND p.role IN ('founder', 'staff')
  ));

-- ── News posts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.news_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'annonce', -- annonce | match | recrutement
  published   BOOLEAN NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY news_read_public ON public.news_posts
  FOR SELECT USING (published = true);

CREATE POLICY news_all_staff ON public.news_posts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
      AND p.role IN ('founder', 'staff')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
      AND p.role IN ('founder', 'staff')
  ));
