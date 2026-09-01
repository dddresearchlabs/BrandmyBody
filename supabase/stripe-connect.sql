-- Stripe Connect Express for listers. Service-role writes from API routes.
-- stripe_account_id + charges_enabled live on the user (lister_accounts) and listings.

create table if not exists public.lister_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_account_id text,
  charges_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.lister_accounts enable row level security;

drop policy if exists "Owner read lister account" on public.lister_accounts;
create policy "Owner read lister account"
  on public.lister_accounts for select
  to authenticated
  using (user_id = auth.uid());

alter table public.listings
  add column if not exists stripe_account_id text,
  add column if not exists charges_enabled boolean not null default false;
