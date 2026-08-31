import { SiteNav } from "@/components/site-nav";
import { formatUsd } from "@/lib/auction";
import { recordPaidCheckout } from "@/lib/record-bid";
import { getStripe } from "@/lib/stripe";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bid received · Brand my Body",
};

type Props = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

function sessionIdFrom(searchParams: { session_id?: string | string[] }) {
  const raw = searchParams.session_id;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() ?? "";
}

export default async function SuccessPage({ searchParams }: Props) {
  const sessionId = sessionIdFrom(await searchParams);

  let heading = "Could not record this bid";
  let body = "Missing Checkout session.";
  let href = "/";
  let linkLabel = "Back to Brand my Body";

  if (sessionId.startsWith("cs_test_")) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const result = recordPaidCheckout(session);

      if (result.error) {
        heading = "Could not record this bid";
        body = result.error;
      } else if (result.unpaid) {
        heading = "Payment is not complete";
        body = "No bid was recorded. Finish Checkout to place a live bid.";
        href = result.href || "/";
      } else if (result.bid) {
        heading = result.already ? "Bid already recorded" : "You're on the body";
        body = `${result.bid.brandName ?? "Your brand"} is live on ${result.spotName} at ${formatUsd(result.bid.amountCents)}.`;
        href = result.href;
        linkLabel = result.listingId === "home" ? "View the auction" : "View the listing";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      heading = "Could not record this bid";
      body =
        message.startsWith("Stripe test mode only") ||
        message === "Missing STRIPE_SECRET_KEY"
          ? message
          : "Could not load this Checkout session.";
    }
  } else if (sessionId) {
    body = "Stripe test mode only. This session was not recorded.";
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16">
        <p className="text-xs tracking-[0.28em] uppercase text-accent">
          Checkout
        </p>
        <h1 className="mt-3 font-serif text-4xl">{heading}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">{body}</p>
        <a
          href={href}
          className="mt-10 inline-flex rounded-full bg-accent px-5 py-3 text-sm text-white hover:brightness-110"
        >
          {linkLabel}
        </a>
      </main>
    </div>
  );
}
