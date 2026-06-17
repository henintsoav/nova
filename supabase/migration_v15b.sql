-- ── Storage bucket boutique (à exécuter dans Supabase SQL Editor) ──────────
-- Si le bucket n'existe pas encore, le créer en public via le Dashboard :
-- Storage → New bucket → name: boutique → toggle Public → Create bucket
-- Puis appliquer ces politiques RLS sur storage.objects :

create policy "boutique_storage_select" on storage.objects
  for select using (bucket_id = 'boutique');

create policy "boutique_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'boutique'
    and exists (
      select 1 from profiles where user_id = auth.uid() and role = 'founder'
    )
  );

create policy "boutique_storage_update" on storage.objects
  for update using (
    bucket_id = 'boutique'
    and exists (
      select 1 from profiles where user_id = auth.uid() and role = 'founder'
    )
  );

create policy "boutique_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'boutique'
    and exists (
      select 1 from profiles where user_id = auth.uid() and role = 'founder'
    )
  );
