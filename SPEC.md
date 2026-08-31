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
- Nav: Browse / List a body / Live auction / How it works / The body / FAQ / Get a spot
- CTA: Get a spot
Site nav (Browse, List a body) on `/`, `/browse`, `/list`, `/account`, `/b/[id]`.
## Marketplace
People list their own bodies. The original single-body demo stays at `/`. Mock marketplace only. No Stripe Connect.
- `/list` — create a listing: display name, socials (X, Instagram, TikTok, website), entire body or selected parts, starting prices, auction length
- Auction length: 1 day / 3 days / 1 week / 2 weeks, stored as `durationDays`: 1 | 3 | 7 | 14. On create, `endsAt` = now + durationDays
- Selected parts use the 10 SPEC spots
- Entire body: one starting price on all 10 spots
- `/browse` — grid of all listings (name, socials, spot count, min starting price, time left). Filter chips: 1 day / 3 days / 1 week / 2 weeks / all. Cards link to `/b/[id]`. Empty state if none
- `/b/[id]` — public listing page cloned from the demo landing, with that person's spots, prices, socials, and time left from `endsAt`. After `endsAt`, listing is closed and Get a spot is disabled/hidden
- `/account` — all listings (mock; no auth yet), with time left from `endsAt` and closed after end
Store: mock `src/lib/listings.ts` plus `src/lib/listings-store.ts` (json at `data/listings.json`). No Supabase yet.
Checkout: Stripe test mode on `/` and `/b/[id]` Get a spot. Same 20% deposit. `success_url` is `/success?session_id={CHECKOUT_SESSION_ID}`. `/success` retrieves the test session, and if `payment_status` is `paid`, writes a live bid (`amountCents`, `brandName`, `website`, `xHandle`, `status: live`) onto that spot. Home auction: mock `src/lib/auction-store.ts` (`data/auction.json`). Marketplace: listings store. Unpaid sessions do not write a bid. Session metadata: `listingId` (`home` or listing id), `spotId`, `durationDays`, `listerSocials`, `buyerSocials`, `bidCents`, `brandName`. Bid table Current shows amount and winning brand. Min next = current + $10. Body spots show brand name (or logo if `logoUrl` is set). Refresh keeps the bid until the mock store is cleared / server data is reset. No Connect, no 10% split.
## Stack
Next.js App Router, TypeScript, Tailwind
Supabase (Postgres + Storage bucket `logos`)
Stripe (test mode first)
Vercel
