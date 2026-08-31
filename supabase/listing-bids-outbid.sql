-- Outbid refunds: store PaymentIntent id, refund timestamp, and a public refund error.
-- Run in the Supabase SQL editor. Service-role writes still go through API routes.

alter table public.listing_bids
  add column if not exists stripe_payment_intent_id text,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_error text;
