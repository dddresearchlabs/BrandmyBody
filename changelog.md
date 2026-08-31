# Changelog

Notable changes to Brand my Body, grouped by the date they first landed.

## 2026-08-31

- Magic-link auth: `/login` emails a link and accepts the 6-digit code; `/logout` signs out; `/auth/callback` finishes the link.
- Site nav shows Log in, or Account and Log out, from the session.
- `/list`, `/account`, and `/connect` require a logged-in user. New listings set `owner_id` from the session. `/account` only shows that user’s listings.
- `/connect` is a placeholder. Stripe Connect is not wired.
- RLS for listings: public can read live rows; only the owner can insert or update their own. SQL: `supabase/listings-auth.sql`.
- Outbid refunds: a new high bid goes `live`, the previous goes `outbid`, and the previous PaymentIntent is refunded. The bid that just paid is never refunded. A failed refund stays live and shows a non-secret error on `/account` and `/success`. SQL: `supabase/listing-bids-outbid.sql`.
- Anti-snipe: a paid bid in the last 10 minutes of `ends_at` extends close by 10 minutes on the home auction and marketplace listings.
- Anti-snipe uses Stripe charge time (not Checkout session create time), so opening Checkout before the last 10 minutes and paying inside that window still extends.
- A bid paid after close is not made live and does not reopen or extend the auction. The just-paid bid is not refunded.
- `/logout` copies cleared auth cookies onto the redirect so the session actually ends.
- `/list` optional photo uploads to public `listing-photos`; `photo_url` shows on `/browse` and `/b/[id]`. Bid logos upload to public `logos` after paid Checkout and draw on the body silhouette. SQL: `supabase/listing-photos.sql`.
- `/auth/callback` exchanges the magic-link `code` for a session and sets cookies on the redirect, so the user is signed in after the link. PKCE needs the same browser. Failures show on `/login`.

## 2026-08-30

- Marketplace: `/list` to create a listing (display name, socials, entire body or selected spots, starting prices, auction length 1 / 3 / 7 / 14 days), `/browse` grid with duration filters, `/b/[id]` listing page, `/account`.
- Shared site nav (Browse, List a body) on `/`, `/browse`, `/list`, `/account`, `/b/[id]`.
- After Stripe success, `/success` records the paid session and shows the live bid and brand. Current on the bid table is live amount + brand. Min next is current + $10.
- Listings and listing bids moved from JSON files to Supabase (`listings`, `listing_spots`, `listing_bids`). Home demo auction stays in `src/lib/auction-store.ts` (`data/auction.json`, in-memory if the file is not writable).
- `/success` POSTs to `/api/checkout/complete` instead of writing bids from the success page.

## 2026-08-29

- Stripe test Checkout for Get a spot: 20% deposit (code minimum $10), success URL `/success?session_id={CHECKOUT_SESSION_ID}`. Test mode only. No Connect.

## 2026-08-28

- Project scaffold (Next.js App Router, TypeScript, Tailwind).
- Product spec in `SPEC.md`.
- Mock auction API, Stripe and Supabase client stubs, and `supabase/schema.sql`.
- Landing page at `/`: headline, body map of 10 spots, live auction table, how it works, FAQ, Get a spot.
