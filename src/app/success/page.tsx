import { headers } from "next/headers";
import { SiteNav } from "@/components/site-nav";
import { formatUsd } from "@/lib/auction";
import { publicError } from "@/lib/public-error";
import type { RecordedCheckout } from "@/lib/record-bid";
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

async function completeViaApi(sessionId: string): Promise<RecordedCheckout> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) {
    throw new Error("Could not record this bid");
  }
  const res = await fetch(`${proto}://${host}/api/checkout/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId }),
    cache: "no-store",
  });
  const data = (await res.json()) as RecordedCheckout & { error?: string };
  if (!res.ok && data.error) {
    return {
      unpaid: false,
      already: false,
      error: data.error,
      listingId: "home",
      spotId: 0,
      spotName: "",
      bid: null,
      href: "/",
    };
  }
  if (!res.ok) {
    throw new Error("Could not record this bid");
  }
  return data;
}

export default async function SuccessPage({ searchParams }: Props) {
  const sessionId = sessionIdFrom(await searchParams);

  let heading = "Could not record this bid";
  let body = "Missing Checkout session.";
  let href = "/";
  let linkLabel = "Back to Brand my Body";

  if (sessionId) {
    try {
      const result = await completeViaApi(sessionId);

      if (result.error) {
        heading = "Could not record this bid";
        body = result.error;
        href = result.href || "/";
      } else if (result.unpaid) {
        heading = "Payment is not complete";
        body = "No bid was recorded. Finish Checkout to place a live bid.";
        href = result.href || "/";
      } else if (result.bid) {
        heading = result.already ? "Bid already recorded" : "You're on the body";
        body = `${result.bid.brandName ?? "Your brand"} is live on ${result.spotName} at ${formatUsd(result.bid.amountCents)}.`;
        if (result.refundError) {
          body = `${body} Previous bidder could not be refunded: ${result.refundError}`;
        }
        href = result.href;
        linkLabel =
          result.listingId === "home" ? "View the auction" : "View the listing";
      }
    } catch (err) {
      heading = "Could not record this bid";
      body = publicError(err, "Could not record this bid");
    }
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
