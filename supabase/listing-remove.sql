-- Listing removal: take a listing down and record who removed it.
-- Run in the Supabase SQL editor. Service-role writes go through API routes.

alter table public.listings
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by text;

alter table public.listings
  drop constraint if exists listings_removed_by_check;

alter table public.listings
  add constraint listings_removed_by_check
  check (removed_by is null or removed_by in ('user', 'admin'));
