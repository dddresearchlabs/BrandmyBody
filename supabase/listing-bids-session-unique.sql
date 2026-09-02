-- One listing_bids row per Checkout session so the webhook and /success
-- cannot double-insert the same paid bid.

create unique index if not exists listing_bids_stripe_session_id_uidx
  on public.listing_bids (stripe_session_id)
  where stripe_session_id is not null and stripe_session_id <> '';
