import "server-only";
import type Stripe from "stripe";
import { asLiveBid, type LiveBid } from "@/lib/auction";
import {
  getHomeAuction,
  hasHomeSession,
  recordHomeBid,
} from "@/lib/auction-store";
import {
  fetchListing,
  hasListingBidSession,
  insertListingBid,
} from "@/lib/listings-db";
import { parseSocials } from "@/lib/listings";
import { publicError } from "@/lib/public-error";
import { getStripe } from "@/lib/stripe";
import { spotById } from "@/lib/spots";

export type RecordedCheckout = {
  unpaid: boolean;
  already: boolean;
  error?: string;
  listingId: string;
  spotId: number;
  spotName: string;
  bid: LiveBid | null;
  href: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function emptyResult(partial: Partial<RecordedCheckout> = {}): RecordedCheckout {
  return {
    unpaid: false,
    already: false,
    listingId: "home",
    spotId: 0,
    spotName: "",
    bid: null,
    href: "/",
    ...partial,
  };
}

function bidFromMetadata(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {};
  const listingId = asString(metadata.listingId) || "home";
  const spotId = Number(metadata.spotId);
  const catalog = Number.isInteger(spotId) ? spotById(spotId) : null;
  if (!catalog) {
    return { error: "Unknown spot on this Checkout session" as const };
  }

  const amountCents = Math.round(Number(metadata.bidCents));
  const brandName = asString(metadata.brandName);
  const email = asString(metadata.email);
  if (!Number.isFinite(amountCents) || amountCents <= 0 || !brandName) {
    return { error: "Checkout session is missing bid metadata" as const };
  }

  let buyerSocials = parseSocials(undefined);
  try {
    buyerSocials = parseSocials(JSON.parse(metadata.buyerSocials || "{}"));
  } catch {
    buyerSocials = parseSocials(undefined);
  }

  const bid: LiveBid = {
    amountCents,
    brandName,
    website: buyerSocials.website || null,
    xHandle: buyerSocials.x || null,
    logoUrl: asString(metadata.logoUrl) || null,
    status: "live",
    stripeSessionId: session.id,
  };

  return {
    listingId,
    spotId: catalog.spotId,
    spotName: catalog.name,
    bid,
    email,
    href: listingId === "home" ? "/" : `/b/${listingId}`,
  };
}

export async function recordPaidCheckout(
  session: Stripe.Checkout.Session,
): Promise<RecordedCheckout> {
  if (session.livemode) {
    return emptyResult({ error: "Stripe test mode only" });
  }

  if (session.payment_status !== "paid") {
    return emptyResult({ unpaid: true });
  }

  const parsed = bidFromMetadata(session);
  if ("error" in parsed) {
    return emptyResult({ error: parsed.error });
  }

  const { listingId, spotId, spotName, bid, email, href } = parsed;

  try {
    if (listingId === "home") {
      if (hasHomeSession(session.id)) {
        const current =
          getHomeAuction().spots.find((spot) => spot.spotId === spotId)
            ?.current ?? bid;
        return {
          unpaid: false,
          already: true,
          listingId,
          spotId,
          spotName,
          bid: asLiveBid(current) ?? bid,
          href,
        };
      }
      recordHomeBid(session.id, spotId, bid);
      return {
        unpaid: false,
        already: false,
        listingId,
        spotId,
        spotName,
        bid,
        href,
      };
    }

    if (await hasListingBidSession(session.id)) {
      const listing = await fetchListing(listingId);
      const current =
        listing?.spots.find((spot) => spot.spotId === spotId)?.current ?? bid;
      return {
        unpaid: false,
        already: true,
        listingId,
        spotId,
        spotName,
        bid: asLiveBid(current) ?? bid,
        href,
      };
    }

    await insertListingBid({
      listingId,
      spotId,
      amountCents: bid.amountCents,
      brandName: bid.brandName ?? "",
      website: bid.website,
      xHandle: bid.xHandle,
      email,
      logoUrl: bid.logoUrl,
      stripeSessionId: session.id,
    });

    return {
      unpaid: false,
      already: false,
      listingId,
      spotId,
      spotName,
      bid,
      href,
    };
  } catch (err) {
    return emptyResult({
      listingId,
      spotId,
      spotName,
      href,
      error: publicError(err, "Could not save bid"),
    });
  }
}

export async function completePaidSession(sessionId: string) {
  if (!sessionId.startsWith("cs_test_")) {
    return emptyResult({
      error: sessionId
        ? "Stripe test mode only. This session was not recorded."
        : "Missing Checkout session.",
    });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return recordPaidCheckout(session);
}
