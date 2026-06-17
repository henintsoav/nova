-- ── Commandes ────────────────────────────────────────────────────────────────

create table if not exists orders (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users(id) on delete set null,
  pseudo            text,                          -- pseudo gamer du client (si connecté)
  status            text        not null default 'pending'
                                check (status in ('pending','paid','shipped','cancelled')),
  items             jsonb       not null default '[]',
  promo_code        text,
  discount_amount   numeric(10,2) not null default 0,
  subtotal          numeric(10,2) not null default 0,
  total             numeric(10,2) not null default 0,
  -- Livraison
  shipping_name     text,
  shipping_email    text,
  shipping_phone    text,
  shipping_address  text,
  shipping_city     text,
  shipping_zip      text,
  shipping_country  text        default 'France',
  -- Stripe
  stripe_session_id text        unique,
  -- Timestamps
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);

alter table orders enable row level security;

-- L'utilisateur voit ses propres commandes
create policy "orders_select_own" on orders
  for select using (auth.uid() = user_id);

-- Le fondateur voit toutes les commandes
create policy "orders_select_founder" on orders
  for select using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

-- Le fondateur peut mettre à jour le statut
create policy "orders_update_founder" on orders
  for update using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'founder')
  );

-- Insertion via service role uniquement (webhook Stripe)
