"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { takeBidLogo } from "@/lib/bid-logo-stash";
import { formatUsd } from "@/lib/auction";

type CompleteResult = {
  unpaid?: boolean;
  already?: boolean;
  error?: string;
  refundError?: string;
  listingId?: string;
  spotName?: string;
  href?: string;
  bid?: { brandName?: string | null; amountCents?: number } | null;
};

const inFlight = new Set<string>();

export function SuccessView({ sessionId }: { sessionId: string }) {
  const [heading, setHeading] = useState("Recording bid…");
  const [body, setBody] = useState("Saving your paid bid.");
  const [href, setHref] = useState("/");
  const [linkLabel, setLinkLabel] = useState("Back to Brand my Body");

  useEffect(() => {
    if (!sessionId || inFlight.has(sessionId)) return;
    inFlight.add(sessionId);

    const complete = async () => {
      let logoUrl: string | undefined;
      let uploadError: string | undefined;
      const file = takeBidLogo(sessionId);
      if (file) {
        try {
          const form = new FormData();
          form.set("sessionId", sessionId);
          form.set("file", file);
          const uploadRes = await fetch("/api/uploads/logo", {
            method: "POST",
            body: form,
          });
          const uploadData = (await uploadRes.json()) as {
            url?: string;
            error?: string;
          };
          if (!uploadRes.ok || !uploadData.url) {
            uploadError = uploadData.error ?? "Could not upload logo";
          } else {
            logoUrl = uploadData.url;
          }
        } catch {
          uploadError = "Could not upload logo";
        }
      }

      const res = await fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, logoUrl }),
      });
      const result = (await res.json()) as CompleteResult;
      if (!res.ok && result.error) {
        setHeading("Could not record this bid");
        setBody(
          uploadError ? `${result.error} Logo: ${uploadError}` : result.error,
        );
        setHref(result.href || "/");
        return;
      }
      if (!res.ok) {
        throw new Error("Could not record this bid");
      }

      if (result.error) {
        setHeading("Could not record this bid");
        setBody(uploadError ? `${result.error} Logo: ${uploadError}` : result.error);
        setHref(result.href || "/");
        return;
      }
      if (result.unpaid) {
        setHeading("Payment is not complete");
        setBody("No bid was recorded. Finish Checkout to place a live bid.");
        setHref(result.href || "/");
        return;
      }
      if (result.bid) {
        setHeading(result.already ? "Bid already recorded" : "You're on the body");
        let next = `${result.bid.brandName ?? "Your brand"} is live on ${result.spotName ?? "this spot"} at ${formatUsd(result.bid.amountCents ?? 0)}.`;
        if (result.refundError) {
          next = `${next} Previous bidder could not be refunded: ${result.refundError}`;
        }
        if (uploadError) {
          next = `${next} Logo could not be uploaded: ${uploadError}`;
        }
        setBody(next);
        setHref(result.href || "/");
        setLinkLabel(
          result.listingId === "home" ? "View the auction" : "View the listing",
        );
        return;
      }
      setHeading("Could not record this bid");
      setBody(uploadError ?? "Could not record this bid");
    };

    complete().catch(() => {
      setHeading("Could not record this bid");
      setBody("Could not record this bid");
    });
  }, [sessionId]);

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
