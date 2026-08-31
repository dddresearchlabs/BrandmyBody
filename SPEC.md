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
People list their own bodies. The original single-body demo stays at `/`. No Stripe Connect.
- Auth: Supabase email magic link. `/login` emails a link and accepts the 6-digit code for tests. `/logout` signs out. `/auth/callback` completes the link. Add `http://localhost:3000/auth/callback` and the production `/auth/callback` URL to Supabase Auth redirect allow list.
- `/list` and `/connect` require a logged-in user. `/connect` is a placeholder; Stripe Connect is not wired. Test checkout stays as it is.
- `/list` — create a listing: display name, socials (X, Instagram, TikTok, website), entire body or selected parts, starting prices, auction length. New rows set `owner_id` from the session. No backfill.
- Auction length: 1 day / 3 days / 1 week / 2 weeks, stored as `durationDays`: 1 | 3 | 7 | 14. On create, `endsAt` = now + durationDays
- Selected parts use the 10 SPEC spots
- Entire body: one starting price on all 10 spots
- `/browse` — public grid of live listings (`status = live`: name, socials, spot count, min starting price, time left). Filter chips: 1 day / 3 days / 1 week / 2 weeks / all. Cards link to `/b/[id]`. Empty state if none. Supabase errors show in the UI (no secrets).
- `/b/[id]` — public listing page cloned from the demo landing, with that person's spots, live bids (current amount + brand), socials, and time left from `endsAt`. After `endsAt`, listing is closed and Get a spot is disabled/hidden. Missing listing → 404. Supabase errors show in the UI.
- `/account` — listings where `owner_id` is the current user, with time left from `endsAt` and closed after end. Requires login.
Store: Supabase tables `listings` (`owner_id` uuid → `auth.users`), `listing_spots`, `listing_bids`. Types in `src/lib/listings.ts`. Server access in `src/lib/listings-db.ts` via the service-role client. Writes stay in API routes and check the user (`POST /api/listings` creates listing + spots with `owner_id`; `POST /api/checkout/complete` inserts `listing_bids` from paid Stripe session metadata). RLS: anon/authenticated can read live listings; only the owner can insert/update their rows. SQL: `supabase/listings-auth.sql`. Never write `data/listings.json`. No mkdir `/var/task/data`.
Checkout: Stripe test mode on `/` and `/b/[id]` Get a spot. Same 20% deposit. `success_url` is `/success?session_id={CHECKOUT_SESSION_ID}`. `/success` POSTs to `/api/checkout/complete` (webhook-equivalent). If `payment_status` is `paid` and the bid is the new high for that spot: status=`live`, previous live bid status=`outbid`, refund the previous PaymentIntent (retrieved from the previous Checkout session if we only stored `stripe_session_id`), store `stripe_payment_intent_id` and `refunded_at`. Never refund the bid that just paid. If the refund fails, the new bid stays live and `/account` shows a non-secret error for the lister. Bid table Current is the live amount + winning brand; outbid rows are not current. Home auction: mock `src/lib/auction-store.ts` (`data/auction.json`, in-memory fallback if the file is not writable). Unpaid sessions do not write a bid. Session metadata: `listingId` (`home` or listing id), `spotId`, `durationDays`, `listerSocials`, `buyerSocials`, `bidCents`, `brandName`. Min next = current + $10. Body spots show brand name (or logo if `logoUrl` is set). No Connect, no 10% split. No live Stripe keys.
Anti-snipe: a paid bid in the last 10 minutes of `ends_at` sets `ends_at` = now + 10 minutes (`listings.ends_at` for marketplace, home demo auction `endsAt`). `/`, `/b/[id]`, and `/browse` use the updated `endsAt` after refresh. SQL: `supabase/listing-bids-outbid.sql`.
## Stack
Next.js App Router, TypeScript, Tailwind
Supabase (Postgres + Auth magic link + Storage bucket `logos`)
Stripe (test mode first)
Vercel
