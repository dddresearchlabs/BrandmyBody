import "server-only";
import { headers } from "next/headers";
import { isListingClosed } from "@/lib/listings";
import {
  fetchListing,
  fetchListingOwner,
  listLiveBidsForClose,
  listOverdueUnpaidWinners,
  listWinnersNeedingEmail,
  markBidForfeited,
  markListingClosed,
  saveBidCloseResult,
} from "@/lib/listings-db";
import { fetchListingPayouts } from "@/lib/lister-accounts";
import {
  createBalancePaymentLink,
  deactivateBalancePaymentLink,
} from "@/lib/stripe-balance";
import { balanceDueAt } from "@/lib/bid-money";
import { sendWinnerPayEmail } from "@/lib/winner-email";

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
    let payId = bid.stripePaymentLinkId;
    let payUrl = bid.stripePaymentLinkUrl;
    let dueAt = bid.balanceDueAt;
    if (!destination) {
      parts.push("Lister has not connected payouts");
    } else if (!payId) {
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
        payId = link.id;
        payUrl = link.url;
        dueAt = dueAt ?? balanceDueAt();
        await saveBidCloseResult(bid.id, {
          stripePaymentLinkId: payId,
          stripePaymentLinkUrl: payUrl,
          balanceDueAt: dueAt,
        });
      }
    } else if (!dueAt && payUrl) {
      dueAt = balanceDueAt();
      await saveBidCloseResult(bid.id, { balanceDueAt: dueAt });
    }
    if (payUrl && dueAt && !bid.winNotifiedAt) {
      const emailed = await sendWinnerPayEmail({
        email: bid.email ?? "",
        listingName: listing.displayName,
        spotName: bid.spotName,
        brandName: bid.brandName ?? "",
        bidCents: bid.amountCents,
        payUrl,
        dueAt,
      });
      if (emailed.error) {
        parts.push(emailed.error);
      } else {
        await saveBidCloseResult(bid.id, {
          winNotifiedAt: new Date().toISOString(),
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

export async function requestFromHeaders() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return new Request(`${proto}://${host}/`);
}

export async function closeListingIfEnded(listingId: string, request: Request) {
  const listing = await fetchListing(listingId);
  if (!listing || listing.status !== "live") return listing;
  if (!isListingClosed(listing.endsAt)) return listing;
  await closeListing({
    listingId,
    closedBy: "cron",
    userId: "cron",
    request,
  });
  return (await fetchListing(listingId)) ?? listing;
}

export async function notifyPendingWinners() {
  const winners = await listWinnersNeedingEmail();
  const results = [];
  for (const bid of winners) {
    const listing = await fetchListing(bid.listingId);
    const payUrl = bid.stripePaymentLinkUrl;
    if (!listing || !payUrl) continue;
    const dueAt = bid.balanceDueAt ?? balanceDueAt();
    if (!bid.balanceDueAt) {
      await saveBidCloseResult(bid.id, { balanceDueAt: dueAt });
    }
    const emailed = await sendWinnerPayEmail({
      email: bid.email ?? "",
      listingName: listing.displayName,
      spotName: bid.spotName,
      brandName: bid.brandName ?? "",
      bidCents: bid.amountCents,
      payUrl,
      dueAt,
    });
    if (emailed.error) {
      await saveBidCloseResult(bid.id, { closeError: emailed.error });
      results.push({ bidId: bid.id, error: emailed.error });
      continue;
    }
    await saveBidCloseResult(bid.id, {
      winNotifiedAt: new Date().toISOString(),
      closeError: null,
    });
    results.push({ bidId: bid.id, emailed: true });
  }
  return results;
}

export async function forfeitOverdueWinners() {
  const winners = await listOverdueUnpaidWinners();
  const results = [];
  for (const bid of winners) {
    if (bid.stripePaymentLinkId) {
      await deactivateBalancePaymentLink(bid.stripePaymentLinkId);
    }
    await markBidForfeited(bid.id);
    results.push({ bidId: bid.id, forfeited: true });
  }
  return results;
}
