-- Lister wear time and optional back body photo.
-- Run in the Supabase SQL editor.

alter table public.listings
  add column if not exists wear_months integer not null default 12;

alter table public.listings
  add column if not exists photo_back_url text;

alter table public.listings
  drop constraint if exists listings_wear_months_check;

alter table public.listings
  add constraint listings_wear_months_check
  check (wear_months in (1, 3, 6, 9, 12, 18, 24));
