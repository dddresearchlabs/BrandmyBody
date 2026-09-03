# Changelog

Notable changes to Brand my Body, grouped by the date they first landed.

## 2026-09-02

- Lister-controlled wear time: `/list` requires Wear for (1, 3, 6, 9, 12, 18, or 24 months), saved as `listings.wear_months`. `/b/[id]`, FAQ, How it works, Get a spot, and Checkout description use that listing’s copy (`worn for 6 months`). Home demo stays 12 months. Optional Front photo (`photo_url`) and Back photo (`photo_back_url`). Photos are not required to publish. SQL: `supabase/listing-wear-photos.sql`.
- Listing photos are not the spot-map background. FRONT/BACK maps stay silhouette + numbered spots. The listing photo under “Your brand, on my body.” opens a lightbox (backdrop or X to close) and is not a bid target.
- Deposit is 20% of the bid with no $5,000 floor. Bid must beat current by $25. Refund if outbid or listing removed. Stripe’s 50-cent charge minimum is silent.
- No platform fee on the 20% deposit. Deposits stay on the platform. Admin (`ADMIN_EMAILS`) can Close auction on any live listing now (also on their own `/account` rows): live high bids win; remaining 80% Payment Link takes 10% of each winning bid; deposit stays (no extra fee). Winners are emailed the 7-day Payment Link. Unpaid after 7 days forfeits the deposit. Owner Close early only if there are zero live bids. When `ends_at` passes, the listing/account/checkout path or daily cron closes and bills winners the remaining 80%. Get a spot has an optional Message for the lister. Site nav and `/account` show the signed-in email as the account name. Test keys only.
- Remove listing: `/account` live rows have “Remove listing” (confirm refunds live deposits and takes the listing down). `POST /api/listings/[id]/remove` checks the session owner. Emails in `ADMIN_EMAILS` also see every live listing with “Admin remove”. Sets `status = removed`, refunds live Stripe test deposits (`status = refunded`), hides the listing from `/browse` and `/b/[id]`. Refund errors show in the UI (no secrets). SQL: `supabase/listing-remove.sql`. Connect unchanged; test keys only.
- Stripe test webhook: `POST /api/webhooks/stripe` verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`. `checkout.session.completed` runs the same bid write, outbid refund, and anti-snipe as `/success`. Idempotent on session id (unique `listing_bids.stripe_session_id`). `/success` stays as a backup writer. Test mode only. SQL: `supabase/listing-bids-session-unique.sql`.
- `/login` email + password (`signInWithPassword` on the same cookie client as magic link). Sign-in errors show on the page. Magic link / 6-digit code stays as a secondary option.
- Site footer on every page with Terms (`/terms`) and Privacy (`/privacy`): marketplace rules (18+, 20% deposit, outbid refunds, 7-day remaining 80%, forfeit, 10% of the winning bid), Stripe / Supabase / Vercel / Resend processors, public listing data vs bidder email. Agree lines on Log in, List a body, and Get a spot.

## 2026-09-01

- Connect onboarding uses Stripe Accounts v2 (`POST /v2/core/accounts`) with Express dashboard and recipient `stripe_transfers`, not Accounts v1 `type=express`. `/connect/callback` sets `charges_enabled` when the account can receive transfers. Marketplace Checkout still destination-charges 10% of the deposit using the v2 account id. Stripe error text shows if Connect fails.

## 2026-08-31

- Magic-link auth: `/login` emails a link and accepts the 6-digit code; `/logout` signs out; `/auth/callback` finishes the link.
- Site nav shows Log in, or Account and Log out, from the session.
- `/list`, `/account`, and `/connect` require a logged-in user. New listings set `owner_id` from the session. `/account` only shows that user’s listings.
- Stripe Connect Express for logged-in listers (test keys only): `/connect` creates or reuses `stripe_account_id`, Account Link onboarding, `/connect/callback` saves `charges_enabled` on the user and listings. `/account` shows not started / pending / ready. Marketplace Checkout destination-charges 10% of the deposit when ready; otherwise “Lister has not connected payouts” and no Checkout. Home demo stays platform Checkout. SQL: `supabase/stripe-connect.sql`.
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
