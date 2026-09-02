-- Close listings after ends_at: winners pay remaining 80%; platform takes 10% of the winning bid from that payment.
-- Admin can close any live listing now. Owner can close early only with no live bids.
-- Run in the Supabase SQL editor. Service-role writes go through API routes.

alter table public.listings
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by text;

alter table public.listings
  drop constraint if exists listings_closed_by_check;

alter table public.listings
  add constraint listings_closed_by_check
  check (closed_by is null or closed_by in ('cron', 'admin', 'owner'));

alter table public.listing_bids
  add column if not exists stripe_payment_link_id text,
  add column if not exists stripe_payment_link_url text,
  add column if not exists balance_paid_at timestamptz,
  add column if not exists deposit_transferred_at timestamptz,
  add column if not exists stripe_transfer_id text,
  add column if not exists close_error text;

drop policy if exists "Public read live listings" on public.listings;
create policy "Public read live listings"
  on public.listings for select
  to anon, authenticated
  using (status in ('live', 'closed'));

drop policy if exists "Public read spots of live listings" on public.listing_spots;
create policy "Public read spots of live listings"
  on public.listing_spots for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status in ('live', 'closed')
    )
  );

drop policy if exists "Public read live listing bids" on public.listing_bids;
create policy "Public read live listing bids"
  on public.listing_bids for select
  to anon, authenticated
  using (
    status = 'live'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status in ('live', 'closed')
    )
  );
