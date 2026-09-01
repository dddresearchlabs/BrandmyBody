# BrandmyBody
Your brand, on my body.
One landing page. 10 spots. Live auction. Stripe 20% deposit.
Site name: **Brand my Body**. Never call it Brand My Shirt, Brand My Mac, or Brand My X.
## Promise
Brands bid on logo spots on my body. Winning logos are printed as ink tattoo and shown in person and in photos. A spot is paid placement, not an endorsement, and not a promise of impressions. There will be a video of the tattoo being placed
## Rules
- Bid must beat current by $10 (min next = current + $10 / 1000 cents)
- 20% deposit, min $5,000, refunded if outbid or refused
- Bid invisible until paid + logo approved
- Bid in last 10 minutes extends close by 10 minutes
- Highest bid at close wins even if goal missed
- Remaining 80% charged after close (7-day Payment Link)
- Logo can be anything as long as it's not offensive; admin can refuse any bid
- Placements are worn for 365 days/1 year 
## Spots
| id | name | view | size | start |
|----|------|------|------|-------|
| 1 | Chest center | front | L · 12 × 12 cm | $50,000 |
| 2 | Upper left chest | front | M · 8 × 5 cm | $25,000 |
| 3 | Upper right chest | front | M · 8 × 5 cm | $25,000|
| 4 | Left sleeve / upper arm | front | M · 8 × 5 cm | $10,000 |
| 5 | Right sleeve / upper arm | front | M · 8 × 5 cm | $10,000|
| 6 | Mid torso | front | S · 6 × 4 cm | $10,000 |
| 7 | Upper back | back | L · 10 × 6 cm | $25,000 |
| 8 | Left shoulder blade | back | S · 6 × 4 cm | $10,000 |
| 9 | Right shoulder blade | back | S · 6 × 4 cm | $10,000 |
| 10 | Leg Area | S · 6 × 4 cm | $25,000 |
## Copy
- Headline: Your brand, on my body.
- Nav: Browse / List a body / Log in / Account / Log out / Live auction / How it works / The body / FAQ / Get a spot
- CTA: Get a spot
Site nav (Browse, List a body, Log in / Account / Log out) on `/`, `/browse`, `/list`, `/account`, `/b/[id]`.
## Marketplace
People list their own bodies. The original single-body demo stays at `/`. Stripe Connect Express (test keys only) for logged-in listers.
- Auth: Supabase email magic link. `/login` emails a link and accepts the 6-digit code for tests. `/logout` signs out. `/auth/callback` exchanges the PKCE `code` for a session and sets auth cookies on the redirect (`@supabase/ssr` `getAll`/`setAll`). Default after success is `/account`. Exchange errors show on `/login` (no secrets). Add `http://localhost:3000/auth/callback` and the production `/auth/callback` URL to the Supabase Auth redirect allow list (no query string).
- `/list` and `/connect` require a logged-in user.
- `/connect` — create a Stripe Connect Express account or reuse this user’s `stripe_account_id`, create an Account Link, and redirect to Stripe onboarding. Return URL `/connect/callback` retrieves the account (reject live mode), then saves `stripe_account_id` and `charges_enabled` on `lister_accounts` and that user’s `listings`. Status: no account id = not started; account id without `charges_enabled` = pending; `charges_enabled` = ready. SQL: `supabase/stripe-connect.sql`.
- `/list` — create a listing: display name, socials (X, Instagram, TikTok, website), entire body or selected parts, starting prices, auction length. New rows set `owner_id` from the session. No backfill.
- Auction length: 1 day / 3 days / 1 week / 2 weeks, stored as `durationDays`: 1 | 3 | 7 | 14. On create, `endsAt` = now + durationDays
- Selected parts use the 10 SPEC spots
- Entire body: one starting price on all 10 spots
- `/browse` — public grid of live listings (`status = live`: name, socials, spot count, min starting price, time left). Filter chips: 1 day / 3 days / 1 week / 2 weeks / all. Cards link to `/b/[id]`. Empty state if none. Supabase errors show in the UI (no secrets).
- `/b/[id]` — public listing page cloned from the demo landing, with that person's spots, live bids (current amount + brand), socials, and time left from `endsAt`. After `endsAt`, listing is closed and Get a spot is disabled/hidden. If the lister is not `charges_enabled`, Get a spot shows “Lister has not connected payouts” and does not start Checkout. Missing listing → 404. Supabase errors show in the UI.
- `/account` — listings where `owner_id` is the current user, with time left from `endsAt` and closed after end. Shows Connect status: not started / pending / ready. Requires login.
Store: Supabase tables `listings` (`owner_id` uuid → `auth.users`, `stripe_account_id`, `charges_enabled`), `lister_accounts` (`user_id` → `auth.users`), `listing_spots`, `listing_bids`. Types in `src/lib/listings.ts`. Server access in `src/lib/listings-db.ts` via the service-role client. Writes stay in API routes and check the user (`POST /api/listings` creates listing + spots with `owner_id`; `POST /api/checkout/complete` inserts `listing_bids` from paid Stripe session metadata). RLS: anon/authenticated can read live listings; only the owner can insert/update their rows. SQL: `supabase/listings-auth.sql`, `supabase/stripe-connect.sql`. Never write `data/listings.json`. No mkdir `/var/task/data`.
Checkout: Stripe test mode on `/` and `/b/[id]` Get a spot. Same 20% deposit. `success_url` is `/success?session_id={CHECKOUT_SESSION_ID}`. `/success` POSTs to `/api/checkout/complete` (webhook-equivalent). If `payment_status` is `paid` and the bid is the new high for that spot: status=`live`, previous live bid status=`outbid`, refund the previous PaymentIntent (retrieved from the previous Checkout session if we only stored `stripe_session_id`), store `stripe_payment_intent_id` and `refunded_at`. Never refund the bid that just paid. If the refund fails, the new bid stays live and `/account` shows a non-secret error for the lister. Bid table Current is the live amount + winning brand; outbid rows are not current. Home auction: mock `src/lib/auction-store.ts` (`data/auction.json`, in-memory fallback if the file is not writable). Platform Checkout only (no Connect destination). Marketplace `/b/[id]`: if the lister has `charges_enabled`, Checkout uses `payment_intent_data.application_fee_amount` = 10% of the deposit and `transfer_data.destination` = the lister `stripe_account_id`. If the lister is not connected, Get a spot shows “Lister has not connected payouts” and does not start Checkout. Unpaid sessions do not write a bid. Session metadata: `listingId` (`home` or listing id), `spotId`, `durationDays`, `listerSocials`, `buyerSocials`, `bidCents`, `brandName`. Min next = current + $10. Body spots show the bid logo on the silhouette when `logoUrl` is set; otherwise brand name. No live Stripe keys.
Anti-snipe: a paid bid in the last 10 minutes of `ends_at` sets `ends_at` = now + 10 minutes (`listings.ends_at` for marketplace, home demo auction `endsAt`). `/`, `/b/[id]`, and `/browse` use the updated `endsAt` after refresh. SQL: `supabase/listing-bids-outbid.sql`.
Photos: `/list` optional photo uploads to the public `listing-photos` bucket via `POST /api/uploads/listing-photo` (service role). Public `photo_url` is stored on `listings` and shown on `/browse` cards and the `/b/[id]` header. Get a spot logo uploads to the public `logos` bucket via `POST /api/uploads/logo` after paid Checkout; `logo_url` is saved on `listing_bids` and home bids. Upload errors show in the UI (no secrets). SQL: `supabase/listing-photos.sql`.
## Stack
Next.js App Router, TypeScript, Tailwind
Supabase (Postgres + Auth magic link + Storage bucket `logos`)
Stripe (test mode first)
Vercel
