import "server-only";
import { isListingClosed } from "@/lib/listings";
import {
  fetchListing,
  listLiveBidsForClose,
  markListingClosed,
  saveBidCloseResult,
} from "@/lib/listings-db";
import { fetchListingPayouts } from "@/lib/lister-accounts";
import {
  createBalancePaymentLink,
  transferDepositToLister,
} from "@/lib/stripe-balance";

export async function closeEndedListing(input: {
  listingId: string;
  closedBy: "cron" | "admin";
  request: Request;
}) {
  const listing = await fetchListing(input.listingId);
  if (!listing) {
    throw new Error("Unknown listing");
  }
  if (listing.status === "removed") {
    throw new Error("This listing was removed");
  }
  if (!isListingClosed(listing.endsAt) && listing.status !== "closed") {
    throw new Error("This listing has not ended");
  }

  const payouts = await fetchListingPayouts(input.listingId);
  const destination = payouts?.chargesEnabled ? payouts.stripeAccountId : null;
  const winners = await listLiveBidsForClose(input.listingId);
  const errors: string[] = [];

  for (const bid of winners) {
    const parts: string[] = [];
    if (!destination) {
      parts.push("Lister has not connected payouts");
    } else {
      if (!bid.depositTransferredAt) {
        const transferred = await transferDepositToLister({
          bidId: bid.id,
          listingId: input.listingId,
          bidCents: bid.amountCents,
          destination,
        });
        if (transferred.error) {
          parts.push(transferred.error);
        } else {
          await saveBidCloseResult(bid.id, {
            depositTransferredAt: new Date().toISOString(),
            stripeTransferId: transferred.transferId,
          });
        }
      }
      if (!bid.stripePaymentLinkId) {
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
    }
    const message = parts.length ? parts.join(" ") : null;
    if (message) {
      errors.push(message);
      await saveBidCloseResult(bid.id, { closeError: message });
    } else if (bid.closeError) {
      await saveBidCloseResult(bid.id, { closeError: null });
    }
  }

  if (listing.status === "live" && errors.length === 0) {
    await markListingClosed(input.listingId, input.closedBy);
  }

  return {
    closed: true,
    winners: winners.length,
    closeError: errors.length ? [...new Set(errors)].join(" ") : null,
  };
}
