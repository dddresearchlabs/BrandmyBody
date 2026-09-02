alter table public.listing_bids
  add column if not exists bidder_message text;
