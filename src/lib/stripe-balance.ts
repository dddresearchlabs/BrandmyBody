import "server-only";
import { balanceCents, winFeeCents } from "@/lib/bid-money";
import { publicError } from "@/lib/public-error";
import { assertStripeTestMode, getStripe } from "@/lib/stripe";
import { siteOrigin } from "@/lib/site-origin";
import { wornForCopy, type WearMonths } from "@/lib/listings";

export async function createBalancePaymentLink(input: {
  request: Request;
  bidId: string;
  listingId: string;
  listingName: string;
  spotName: string;
  bidCents: number;
  wearMonths: WearMonths;
  destination: string;
  email?: string | null;
}) {
  const amount = balanceCents(input.bidCents);
  const fee = winFeeCents(input.bidCents);
  if (amount < 50) {
    return { url: null as string | null, id: null as string | null };
  }
  const origin = siteOrigin(input.request);
  const stripe = getStripe();
  try {
    const link = await stripe.paymentLinks.create({
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: `Brand my Body · ${input.listingName} · ${input.spotName} remaining 80%`,
            },
          },
        },
      ],
      application_fee_amount: fee,
      transfer_data: { destination: input.destination },
      restrictions: { completed_sessions: { limit: 1 } },
      after_completion: {
        type: "redirect",
        redirect: {
          url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        },
      },
      metadata: {
        kind: "balance",
        listingId: input.listingId,
        bidId: input.bidId,
        bidCents: String(input.bidCents),
        spotName: input.spotName,
      },
      payment_intent_data: {
        description: `Remaining 80% for an ink tattoo logo placement, ${wornForCopy(input.wearMonths)}. Paid placement, not an endorsement.`,
        metadata: {
          kind: "balance",
          listingId: input.listingId,
          bidId: input.bidId,
          bidCents: String(input.bidCents),
        },
      },
    });
    assertStripeTestMode(link);
    if (link.livemode) {
      throw new Error("Stripe test mode only");
    }
    const email = input.email?.trim();
    const url =
      email && email.includes("@")
        ? `${link.url}${link.url.includes("?") ? "&" : "?"}prefilled_email=${encodeURIComponent(email)}`
        : link.url;
    return { url, id: link.id };
  } catch (err) {
    return {
      url: null as string | null,
      id: null as string | null,
      error: publicError(err, "Could not create the remaining 80% Payment Link"),
    };
  }
}
