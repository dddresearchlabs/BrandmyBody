import "server-only";
import type Stripe from "stripe";
import { asLiveBid, type LiveBid } from "@/lib/auction";
import {
  getHomeAuction,
  hasHomeSession,
  recordHomeBid,
} from "@/lib/auction-store";
import { parseSocials } from "@/lib/listings";
import {
  getListing,
  hasListingSession,
  recordListingBid,
} from "@/lib/listings-store";
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

function bidFromMetadata(
  session: Stripe.Checkout.Session,
): Omit<RecordedCheckout, "unpaid" | "already" | "error"> & {
  bid: LiveBid;
} | { error: string } {
  const metadata = session.metadata ?? {};
  const listingId = asString(metadata.listingId) || "home";
  const spotId = Number(metadata.spotId);
  const catalog = Number.isInteger(spotId) ? spotById(spotId) : null;
  if (!catalog) {
    return { error: "Unknown spot on this Checkout session" };
  }

  const amountCents = Math.round(Number(metadata.bidCents));
  const brandName = asString(metadata.brandName);
  if (!Number.isFinite(amountCents) || amountCents <= 0 || !brandName) {
    return { error: "Checkout session is missing bid metadata" };
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
    href: listingId === "home" ? "/" : `/b/${listingId}`,
  };
}

export function recordPaidCheckout(
  session: Stripe.Checkout.Session,
): RecordedCheckout {
  if (session.livemode) {
    return {
      unpaid: false,
      already: false,
      error: "Stripe test mode only",
      listingId: "home",
      spotId: 0,
      spotName: "",
      bid: null,
      href: "/",
    };
  }

  if (session.payment_status !== "paid") {
    return {
      unpaid: true,
      already: false,
      listingId: "home",
      spotId: 0,
      spotName: "",
      bid: null,
      href: "/",
    };
  }

  const parsed = bidFromMetadata(session);
  if ("error" in parsed) {
    return {
      unpaid: false,
      already: false,
      error: parsed.error,
      listingId: "home",
      spotId: 0,
      spotName: "",
      bid: null,
      href: "/",
    };
  }

  const { listingId, spotId, spotName, bid, href } = parsed;

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

  const listing = getListing(listingId);
  if (!listing) {
    return {
      unpaid: false,
      already: false,
      error: "Unknown listing",
      listingId,
      spotId,
      spotName,
      bid,
      href,
    };
  }

  if (hasListingSession(listingId, session.id)) {
    const current =
      listing.spots.find((spot) => spot.spotId === spotId)?.current ?? bid;
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

  recordListingBid(listingId, session.id, spotId, bid);
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
