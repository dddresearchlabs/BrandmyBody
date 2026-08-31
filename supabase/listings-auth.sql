-- Marketplace listings auth: owner_id + RLS.
-- Run in the Supabase SQL editor. No backfill; existing rows may have null owner_id.

alter table public.listings
  add column if not exists owner_id uuid references auth.users (id);

create index if not exists listings_owner_id_idx on public.listings (owner_id);

alter table public.listings enable row level security;
alter table public.listing_spots enable row level security;
alter table public.listing_bids enable row level security;

drop policy if exists "Public read live listings" on public.listings;
create policy "Public read live listings"
  on public.listings for select
  to anon, authenticated
  using (status = 'live');

drop policy if exists "Owner read own listings" on public.listings;
create policy "Owner read own listings"
  on public.listings for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Owner insert listings" on public.listings;
create policy "Owner insert listings"
  on public.listings for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owner update listings" on public.listings;
create policy "Owner update listings"
  on public.listings for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Public read spots of live listings" on public.listing_spots;
create policy "Public read spots of live listings"
  on public.listing_spots for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'live'
    )
  );

drop policy if exists "Owner read own listing spots" on public.listing_spots;
create policy "Owner read own listing spots"
  on public.listing_spots for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "Owner insert listing spots" on public.listing_spots;
create policy "Owner insert listing spots"
  on public.listing_spots for insert
  to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "Owner update listing spots" on public.listing_spots;
create policy "Owner update listing spots"
  on public.listing_spots for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
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
      where l.id = listing_id and l.status = 'live'
    )
  );

drop policy if exists "Owner read bids on own listings" on public.listing_bids;
create policy "Owner read bids on own listings"
  on public.listing_bids for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );
