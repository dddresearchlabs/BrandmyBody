-- BrandmyBody — Brand my Body
-- Live auction of 10 body logo spots. Storage bucket: logos.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table auction (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  headline text not null,
  status text not null default 'live'
    check (status in ('draft', 'live', 'closed')),
  opens_at timestamptz,
  closes_at timestamptz not null,
  anti_snipe_minutes integer not null default 10,
  wear_days integer not null default 365,
  min_increment_cents integer not null default 2000,
  deposit_percent integer not null default 20,
  min_deposit_cents integer not null default 500000,
  balance_due_days integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brandmybody_name check (name = 'Brand my Body')
);

create trigger auction_set_updated_at
before update on auction
for each row execute function set_updated_at();

create table spots (
  id smallint primary key check (id between 1 and 10),
  auction_id uuid not null references auction (id) on delete cascade,
  name text not null,
  view text check (view in ('front', 'back') or view is null),
  size_code text not null check (size_code in ('S', 'M', 'L')),
  size_label text not null,
  width_cm numeric(5, 1) not null,
  height_cm numeric(5, 1) not null,
  start_cents integer not null check (start_cents > 0),
  created_at timestamptz not null default now()
);

create table bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auction (id) on delete cascade,
  spot_id smallint not null references spots (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  deposit_cents integer not null check (deposit_cents > 0),
  brand_name text,
  email text,
  logo_path text,
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment',
      'paid_pending_approval',
      'visible',
      'outbid',
      'refused',
      'refunded',
      'won'
    )),
  paid_at timestamptz,
  logo_approved_at timestamptz,
  refused_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_payment_link_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bids_visible_requires_paid_and_approved check (
    status not in ('visible', 'won')
    or (paid_at is not null and logo_approved_at is not null)
  )
);

create trigger bids_set_updated_at
before update on bids
for each row execute function set_updated_at();

create index bids_spot_visible_amount_idx
  on bids (spot_id, amount_cents desc)
  where status in ('visible', 'won');

create index bids_auction_id_idx on bids (auction_id);

alter table auction enable row level security;
alter table spots enable row level security;
alter table bids enable row level security;

create policy "Public read auction"
  on auction for select
  to anon, authenticated
  using (true);

create policy "Public read spots"
  on spots for select
  to anon, authenticated
  using (true);

create policy "Public read visible bids"
  on bids for select
  to anon, authenticated
  using (status in ('visible', 'won'));

insert into storage.buckets (id, name, public)
values ('logos', 'logos', false)
on conflict (id) do nothing;

insert into auction (
  slug,
  name,
  headline,
  status,
  opens_at,
  closes_at
)
values (
  'brand-my-body',
  'Brand my Body',
  'Your brand, on my body.',
  'live',
  now(),
  now() + interval '30 days'
)
on conflict (slug) do nothing;

insert into spots (
  id, auction_id, name, view, size_code, size_label, width_cm, height_cm, start_cents
)
select
  spot.id,
  a.id,
  spot.name,
  spot.view,
  spot.size_code,
  spot.size_label,
  spot.width_cm,
  spot.height_cm,
  spot.start_cents
from auction a
cross join (
  values
    (1::smallint, 'Chest center', 'front', 'L', 'L · 12 × 12 cm', 12.0, 12.0, 5000000),
    (2, 'Upper left chest', 'front', 'M', 'M · 8 × 5 cm', 8.0, 5.0, 2500000),
    (3, 'Upper right chest', 'front', 'M', 'M · 8 × 5 cm', 8.0, 5.0, 2500000),
    (4, 'Left sleeve / upper arm', 'front', 'M', 'M · 8 × 5 cm', 8.0, 5.0, 1000000),
    (5, 'Right sleeve / upper arm', 'front', 'M', 'M · 8 × 5 cm', 8.0, 5.0, 1000000),
    (6, 'Mid torso', 'front', 'S', 'S · 6 × 4 cm', 6.0, 4.0, 1000000),
    (7, 'Upper back', 'back', 'L', 'L · 10 × 6 cm', 10.0, 6.0, 2500000),
    (8, 'Left shoulder blade', 'back', 'S', 'S · 6 × 4 cm', 6.0, 4.0, 1000000),
    (9, 'Right shoulder blade', 'back', 'S', 'S · 6 × 4 cm', 6.0, 4.0, 1000000),
    (10, 'Leg Area', null, 'S', 'S · 6 × 4 cm', 6.0, 4.0, 2500000)
) as spot(id, name, view, size_code, size_label, width_cm, height_cm, start_cents)
where a.slug = 'brand-my-body'
on conflict (id) do nothing;
