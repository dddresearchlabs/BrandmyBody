import "server-only";
import type Stripe from "stripe";
import { asLiveBid, type LiveBid } from "@/lib/auction";
import {
  getHomeAuction,
  hasHomeSession,
  recordHomeBid,
  setHomeBidLogo,
} from "@/lib/auction-store";
import {
  markListingBidRefunded,
  markListingBidRefundError,
  recordPaidListingBid,
} from "@/lib/listings-db";
import { parseSocials } from "@/lib/listings";
import { publicError } from "@/lib/public-error";
import {
  paidAtFromSession,
  paymentIntentIdFromSession,
  refundOutbidPayment,
  retrieveTestCheckoutSession,
} from "@/lib/stripe-refund";
import { spotById } from "@/lib/spots";

export type RecordedCheckout = {
  unpaid: boolean;
  already: boolean;
  error?: string;
  refundError?: string;
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

function bidFromMetadata(
  session: Stripe.Checkout.Session,
  paymentIntentId: string | null,
) {
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
    stripePaymentIntentId: paymentIntentId ?? undefined,
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

async function refundPrevious(input: {
  previousSessionId?: string | null;
  previousPaymentIntentId?: string | null;
  newSessionId: string;
  newPaymentIntentId?: string | null;
  bidId?: string;
}) {
  const result = await refundOutbidPayment({
    previousSessionId: input.previousSessionId,
    previousPaymentIntentId: input.previousPaymentIntentId,
    newSessionId: input.newSessionId,
    newPaymentIntentId: input.newPaymentIntentId,
  });
  if (input.bidId) {
    if (result.error) {
      await markListingBidRefundError(input.bidId, result.error);
    } else {
      await markListingBidRefunded(input.bidId, result.paymentIntentId);
    }
  }
  return result.error;
}

export async function recordPaidCheckout(
  session: Stripe.Checkout.Session,
  options?: { logoUrl?: string },
): Promise<RecordedCheckout> {
  if (session.livemode) {
    return emptyResult({ error: "Stripe test mode only" });
  }

  if (session.payment_status !== "paid") {
    return emptyResult({ unpaid: true });
  }

  const paymentIntentId = paymentIntentIdFromSession(session);
  const parsed = bidFromMetadata(session, paymentIntentId);
  if ("error" in parsed) {
    return emptyResult({ error: parsed.error });
  }

  const { listingId, spotId, spotName, bid, email, href } = parsed;
  if (options?.logoUrl) {
    bid.logoUrl = options.logoUrl;
  }
  const { paidAt, stable: paidAtStable } = paidAtFromSession(session);

  try {
    if (listingId === "home") {
      if (hasHomeSession(session.id)) {
        if (bid.logoUrl) {
          setHomeBidLogo(session.id, bid.logoUrl);
        }
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
      const recorded = recordHomeBid(session.id, spotId, bid, paidAt);
      let refundError: string | undefined;
      if (recorded.previous) {
        refundError =
          (await refundPrevious({
            previousSessionId: recorded.previous.stripeSessionId,
            previousPaymentIntentId: recorded.previous.stripePaymentIntentId,
            newSessionId: session.id,
            newPaymentIntentId: paymentIntentId,
          })) ?? undefined;
      }
      return {
        unpaid: false,
        already: false,
        refundError,
        listingId,
        spotId,
        spotName,
        bid: recorded.accepted ? bid : null,
        href,
        error: recorded.accepted
          ? undefined
          : recorded.closed
            ? "This listing is closed"
            : "A higher bid is already live on this spot.",
      };
    }

    const recorded = await recordPaidListingBid({
      listingId,
      spotId,
      amountCents: bid.amountCents,
      brandName: bid.brandName ?? "",
      website: bid.website,
      xHandle: bid.xHandle,
      email,
      logoUrl: bid.logoUrl,
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      paidAt,
      paidAtStable,
    });

    const refundErrors: string[] = [];
    for (const previous of recorded.previous) {
      const refundError = await refundPrevious({
        previousSessionId: previous.stripeSessionId,
        previousPaymentIntentId: previous.stripePaymentIntentId,
        newSessionId: session.id,
        newPaymentIntentId: paymentIntentId,
        bidId: previous.id,
      });
      if (refundError) refundErrors.push(refundError);
    }

    return {
      unpaid: false,
      already: recorded.already,
      refundError: refundErrors[0],
      listingId,
      spotId,
      spotName,
      bid: recorded.accepted ? { ...bid, status: "live" } : null,
      href,
      error: recorded.accepted
        ? undefined
        : recorded.closed
          ? "This listing is closed"
          : "A higher bid is already live on this spot.",
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

export async function completePaidSession(
  sessionId: string,
  options?: { logoUrl?: string },
) {
  if (!sessionId.startsWith("cs_test_")) {
    return emptyResult({
      error: sessionId
        ? "Stripe test mode only. This session was not recorded."
        : "Missing Checkout session.",
    });
  }

  const session = await retrieveTestCheckoutSession(sessionId);
  return recordPaidCheckout(session, options);
}
