alter table public.listing_bids
  add column if not exists win_notified_at timestamptz,
  add column if not exists balance_due_at timestamptz,
  add column if not exists forfeited_at timestamptz;
