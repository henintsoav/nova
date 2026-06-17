-- ── Partenaires ──────────────────────────────────────────────────────────────

create table if not exists partners (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  description   text,
  logo_url      text,
  website_url   text,
  display_order integer     not null default 0,
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table partners enable row level security;

create policy "partners_select_all" on partners
  for select using (true);

create policy "partners_insert_founder" on partners
  for insert with check (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

create policy "partners_update_founder" on partners
  for update using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

create policy "partners_delete_founder" on partners
  for delete using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

-- Storage bucket `partners` (créer manuellement dans Dashboard : Storage → New bucket → "partners" → Public)
create policy "partners_storage_select" on storage.objects
  for select using (bucket_id = 'partners');

create policy "partners_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'partners'
    and exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

create policy "partners_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'partners'
    and exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );
