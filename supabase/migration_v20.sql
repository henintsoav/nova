-- ── Photo joueur dans le roster ──────────────────────────────────────────────

ALTER TABLE roster_members
  ADD COLUMN IF NOT EXISTS photo_url text;

-- ── Résultats de matchs ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS match_results (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  game        text        NOT NULL,
  opponent    text        NOT NULL,
  score       text,                   -- ex: "2-1"
  result      text        CHECK (result IN ('win', 'loss', 'draw')),
  competition text,                   -- ex: "Tournoi Spring 2026"
  played_at   date        NOT NULL DEFAULT current_date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_results_select_all" ON match_results
  FOR SELECT USING (true);

CREATE POLICY "match_results_insert_founder" ON match_results
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'founder')
  );

CREATE POLICY "match_results_delete_founder" ON match_results
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'founder')
  );

CREATE POLICY "match_results_update_founder" ON match_results
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'founder')
  );

-- ── Storage bucket "rosters" (photos des joueurs) ────────────────────────────
-- Créer le bucket manuellement dans Supabase Dashboard :
-- Storage → New bucket → nom : rosters → Public → Create
-- Puis appliquer ces policies :

INSERT INTO storage.buckets (id, name, public)
  VALUES ('rosters', 'rosters', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "rosters_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'rosters');

CREATE POLICY "rosters_insert_founder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'rosters'
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'founder')
  );

CREATE POLICY "rosters_update_founder" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'rosters'
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'founder')
  );

CREATE POLICY "rosters_delete_founder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'rosters'
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'founder')
  );
