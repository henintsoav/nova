-- ── Codes de promotion ───────────────────────────────────────────────────────

create table if not exists promo_codes (
  id             uuid        primary key default gen_random_uuid(),
  code           text        not null unique,
  discount_type  text        not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order      numeric(10,2),
  max_uses       integer,
  uses_count     integer     not null default 0,
  active         boolean     not null default true,
  expires_at     timestamptz,
  created_by     uuid        references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table promo_codes enable row level security;

-- Tout utilisateur authentifié peut valider un code (il faut le connaître pour s'en servir)
create policy "promo_select_auth" on promo_codes
  for select using (auth.role() = 'authenticated');

create policy "promo_insert_founder" on promo_codes
  for insert with check (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

create policy "promo_update_founder" on promo_codes
  for update using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

create policy "promo_delete_founder" on promo_codes
  for delete using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );
