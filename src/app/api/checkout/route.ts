import { fetchListing } from "@/lib/listings-db";
import { getHomeAuction } from "@/lib/auction-store";
import { asLiveBid, minNextCents } from "@/lib/auction";
import { applicationFeeCents } from "@/lib/connect";
import {
  isListingClosed,
  parseSocials,
  socialsToMeta,
  type Listing,
} from "@/lib/listings";
import { fetchListingPayouts } from "@/lib/lister-accounts";
import { siteOrigin } from "@/lib/site-origin";
import { getStripe, stripeKeyMode } from "@/lib/stripe";
import { spotById } from "@/lib/spots";
import { publicError } from "@/lib/public-error";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

const DEPOSIT_PERCENT = 0.2;
const MIN_DEPOSIT_CENTS = 1000;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function meta(value: string) {
  return value.slice(0, 500);
}

function listerPayoutsResponse() {
  return Response.json(
    {
      error: "Lister has not connected payouts",
      stripeKeyMode: stripeKeyMode(),
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const listingId = asString(payload.listingId);
  const spotId = Number(payload.spotId);
  const bidCents = Math.round(Number(payload.bidCents));
  const brandName = asString(payload.brandName);
  const email = asString(payload.email);
  const buyerSocials = parseSocials(payload.buyerSocials);

  const catalog = Number.isInteger(spotId) ? spotById(spotId) : null;
  if (!catalog) {
    return Response.json({ error: "Unknown spot" }, { status: 400 });
  }

  let listing: Listing | null = null;
  let minNextAmount: number = catalog.startCents;
  let returnPath = "/";
  const isHome = !listingId || listingId === "home";

  if (!isHome) {
    try {
      listing = await fetchListing(listingId);
    } catch (err) {
      return Response.json(
        { error: publicError(err, "Could not load listing") },
        { status: 503 },
      );
    }
    if (!listing) {
      return Response.json({ error: "Unknown listing" }, { status: 400 });
    }
    if (isListingClosed(listing.endsAt)) {
      return Response.json({ error: "This listing is closed" }, { status: 400 });
    }
    const listingSpot = listing.spots.find((spot) => spot.spotId === spotId);
    if (!listingSpot) {
      return Response.json(
        { error: "That spot is not on this listing" },
        { status: 400 },
      );
    }
    minNextAmount = minNextCents(
      listingSpot.startCents,
      asLiveBid(listingSpot.current),
    );
    returnPath = `/b/${listing.id}`;
  } else {
    const home = getHomeAuction();
    if (home.closed) {
      return Response.json({ error: "This listing is closed" }, { status: 400 });
    }
    const homeSpot = home.spots.find((spot) => spot.spotId === spotId);
    minNextAmount = homeSpot?.minNextCents ?? catalog.startCents;
  }

  if (!Number.isFinite(bidCents) || bidCents < minNextAmount) {
    return Response.json(
      { error: "Bid must be at least the min next amount" },
      { status: 400 },
    );
  }

  if (!brandName) {
    return Response.json({ error: "Brand name is required" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const depositCents = Math.max(
    Math.round(bidCents * DEPOSIT_PERCENT),
    MIN_DEPOSIT_CENTS,
  );

  const origin = siteOrigin(request);
  const metadata: Record<string, string> = {
    listingId: listing?.id ?? "home",
    spotId: String(catalog.spotId),
    bidCents: String(bidCents),
    brandName: meta(brandName),
    email: meta(email),
    buyerSocials: socialsToMeta(buyerSocials),
  };

  if (listing) {
    metadata.durationDays = String(listing.durationDays);
    metadata.listerSocials = socialsToMeta(listing.socials);
  }

  let paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData | undefined;
  if (listing) {
    let payouts;
    try {
      payouts = await fetchListingPayouts(listing.id);
    } catch (err) {
      return Response.json(
        { error: publicError(err, "Could not load listing") },
        { status: 503 },
      );
    }
    if (!payouts?.chargesEnabled || !payouts.stripeAccountId) {
      return listerPayoutsResponse();
    }
    const fee = Math.min(
      applicationFeeCents(depositCents),
      Math.max(0, depositCents - 1),
    );
    paymentIntentData = {
      application_fee_amount: fee,
      transfer_data: { destination: payouts.stripeAccountId },
    };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}?checkout=cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: depositCents,
            product_data: {
              name: listing
                ? `Brand my Body · ${listing.displayName} · ${catalog.name} deposit`
                : `Brand my Body · ${catalog.name} deposit`,
              description:
                "20% deposit for an ink tattoo logo placement. Paid placement, not an endorsement.",
            },
          },
        },
      ],
      metadata,
      ...(paymentIntentData
        ? { payment_intent_data: paymentIntentData }
        : {}),
    });

    if (!session.url) {
      return Response.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 502 },
      );
    }

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    if (
      /destination|application_fee|connected account|charges_enabled|payouts/i.test(
        message,
      )
    ) {
      return listerPayoutsResponse();
    }
    const safe =
      message.startsWith("Stripe test mode only") ||
      message === "Missing STRIPE_SECRET_KEY"
        ? message
        : "Checkout failed";
    return Response.json({ error: safe }, { status: 503 });
  }
}
