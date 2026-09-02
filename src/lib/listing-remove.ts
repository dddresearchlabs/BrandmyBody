import "server-only";
import {
  fetchListingOwner,
  listLiveBidsForRefund,
  markListingRemoved,
  markLiveBidRefunded,
  markListingBidRefundError,
} from "@/lib/listings-db";
import { refundDeposit } from "@/lib/stripe-refund";

export async function removeListingDeposits(input: {
  listingId: string;
  userId: string;
  asAdmin: boolean;
}) {
  const listing = await fetchListingOwner(input.listingId);
  if (!listing) {
    throw new Error("Unknown listing");
  }
  if (listing.status === "removed") {
    throw new Error("This listing was removed");
  }
  if (!input.asAdmin && listing.ownerId !== input.userId) {
    throw new Error("You can only remove your own listings");
  }

  await markListingRemoved(input.listingId, input.asAdmin ? "admin" : "user");

  const live = await listLiveBidsForRefund(input.listingId);
  const errors: string[] = [];
  for (const bid of live) {
    if (!bid.stripeSessionId && !bid.stripePaymentIntentId) {
      const message = "Could not refund deposit: missing PaymentIntent";
      await markListingBidRefundError(bid.id, message);
      errors.push(message);
      continue;
    }
    const result = await refundDeposit({
      sessionId: bid.stripeSessionId,
      paymentIntentId: bid.stripePaymentIntentId,
    });
    if (result.error) {
      await markListingBidRefundError(bid.id, result.error);
      errors.push(result.error);
      continue;
    }
    await markLiveBidRefunded(bid.id, result.paymentIntentId);
  }

  return {
    refundError: errors.length ? [...new Set(errors)].join(" ") : null,
  };
}
