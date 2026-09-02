import "server-only";
import { isListingClosed } from "@/lib/listings";
import {
  fetchListing,
  fetchListingOwner,
  listLiveBidsForClose,
  markListingClosed,
  saveBidCloseResult,
} from "@/lib/listings-db";
import { fetchListingPayouts } from "@/lib/lister-accounts";
import { createBalancePaymentLink } from "@/lib/stripe-balance";

export type CloseBy = "cron" | "admin" | "owner";

async function invoiceWinners(input: {
  listingId: string;
  request: Request;
}) {
  const listing = await fetchListing(input.listingId);
  if (!listing) {
    throw new Error("Unknown listing");
  }
  const payouts = await fetchListingPayouts(input.listingId);
  const destination = payouts?.chargesEnabled ? payouts.stripeAccountId : null;
  const winners = await listLiveBidsForClose(input.listingId);
  const errors: string[] = [];

  for (const bid of winners) {
    const parts: string[] = [];
    if (!destination) {
      parts.push("Lister has not connected payouts");
    } else if (!bid.stripePaymentLinkId) {
      const link = await createBalancePaymentLink({
        request: input.request,
        bidId: bid.id,
        listingId: input.listingId,
        listingName: listing.displayName,
        spotName: bid.spotName,
        bidCents: bid.amountCents,
        wearMonths: listing.wearMonths,
        destination,
        email: bid.email,
      });
      if (link.error) {
        parts.push(link.error);
      } else if (link.id && link.url) {
        await saveBidCloseResult(bid.id, {
          stripePaymentLinkId: link.id,
          stripePaymentLinkUrl: link.url,
        });
      }
    }
    const message = parts.length ? parts.join(" ") : null;
    if (message) {
      errors.push(message);
      await saveBidCloseResult(bid.id, { closeError: message });
    } else if (bid.closeError) {
      await saveBidCloseResult(bid.id, { closeError: null });
    }
  }

  return { listing, winners: winners.length, errors };
}

export async function closeListing(input: {
  listingId: string;
  closedBy: CloseBy;
  userId: string;
  request: Request;
  asAdmin?: boolean;
}) {
  const owner = await fetchListingOwner(input.listingId);
  if (!owner) {
    throw new Error("Unknown listing");
  }
  if (owner.status === "removed") {
    throw new Error("This listing was removed");
  }

  if (input.closedBy === "owner") {
    if (input.asAdmin) {
      throw new Error("Not allowed");
    }
    if (owner.ownerId !== input.userId) {
      throw new Error("You can only close your own listings");
    }
    const listing = await fetchListing(input.listingId);
    if (!listing) {
      throw new Error("Unknown listing");
    }
    const liveCount = listing.spots.filter((spot) => spot.current).length;
    if (liveCount > 0) {
      throw new Error("Close early is only for listings with no live bids");
    }
    if (listing.status === "live") {
      await markListingClosed(input.listingId, "owner", listing.endsAt);
    }
    return { closed: true, winners: 0, closeError: null as string | null };
  }

  if (input.closedBy === "cron") {
    const listing = await fetchListing(input.listingId);
    if (!listing) {
      throw new Error("Unknown listing");
    }
    if (!isListingClosed(listing.endsAt) && listing.status !== "closed") {
      throw new Error("This listing has not ended");
    }
  }

  const invoiced = await invoiceWinners({
    listingId: input.listingId,
    request: input.request,
  });
  const closeError = invoiced.errors.length
    ? [...new Set(invoiced.errors)].join(" ")
    : null;

  if (invoiced.listing.status === "live" && invoiced.errors.length === 0) {
    await markListingClosed(
      input.listingId,
      input.closedBy,
      invoiced.listing.endsAt,
    );
  }

  return {
    closed: true,
    winners: invoiced.winners,
    closeError,
  };
}
