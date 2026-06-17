-- ── Boutique products ────────────────────────────────────────────────────────

create table if not exists boutique_products (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  category       text        not null,
  description    text,
  composition    text,
  care           text,
  original_price numeric(10,2) not null default 0,
  is_promo       boolean     not null default false,
  promo_percent  integer     check (promo_percent between 1 and 99),
  images         text[]      not null default '{}',
  created_by     uuid        references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table boutique_products enable row level security;

create policy "boutique_select_all" on boutique_products
  for select using (true);

create policy "boutique_insert_founder" on boutique_products
  for insert with check (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

create policy "boutique_update_founder" on boutique_products
  for update using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

create policy "boutique_delete_founder" on boutique_products
  for delete using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

-- Storage bucket for product images (run once in dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('boutique', 'boutique', true)
-- on conflict do nothing;
