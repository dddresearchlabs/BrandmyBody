"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BodyMap } from "@/components/body-map";
import { SiteNav } from "@/components/site-nav";
import type { Auction, Spot } from "@/lib/auction";
import { dollars, formatUsd } from "@/lib/auction";
import {
  listingToAuction,
  socialHref,
  type Listing,
} from "@/lib/listings";

const NAV = [
  { href: "#auction", label: "Live auction" },
  { href: "#how", label: "How it works" },
  { href: "#body", label: "The body" },
  { href: "#faq", label: "FAQ" },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Pick a spot and bid",
    body: "Choose a logo placement. Your bid must beat the current price by $20. A 20% deposit is due now, $5,000 minimum. Refunded if you are outbid or refused.",
  },
  {
    n: "02",
    title: "Pay and get approved",
    body: "Your bid stays invisible until the deposit is paid and the logo is approved. Anything non-offensive is allowed; we can refuse any bid.",
  },
  {
    n: "03",
    title: "Win, ink, wear a year",
    body: "Highest bid at close wins even if the goal is missed. The remaining 80% is due on a 7-day Payment Link. The logo is printed as an ink tattoo and worn for 365 days. There will be a video of the tattoo being placed.",
  },
] as const;

const FAQS = [
  {
    q: "What am I buying?",
    a: "A paid logo placement on my body, printed as an ink tattoo and shown in person and in photos. It is not an endorsement and not a promise of impressions.",
  },
  {
    q: "How do bids work?",
    a: "A bid must beat the current price by $20. Bids are invisible until the deposit is paid and the logo is approved. A bid in the last 10 minutes extends close by 10 minutes.",
  },
  {
    q: "What is the deposit?",
    a: "20% of the bid, minimum $5,000. Refunded if you are outbid or the bid is refused.",
  },
  {
    q: "What if the goal is missed?",
    a: "The highest bid at close still wins.",
  },
  {
    q: "When is the rest due?",
    a: "The remaining 80% is charged after close on a 7-day Payment Link.",
  },
  {
    q: "How long is the placement worn?",
    a: "365 days / 1 year. There will be a video of the tattoo being placed.",
  },
] as const;

function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!endsAt) {
    return { label: "—", closed: false };
  }

  const timestamp = now ?? Date.now();
  const remaining = Math.max(0, new Date(endsAt).getTime() - timestamp);
  const closed = remaining <= 0;

  if (now === null) {
    return { label: closed ? "Closed" : "—", closed };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    label: closed
      ? "Closed"
      : `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
    closed,
  };
}

export function Landing({ listing }: { listing?: Listing }) {
  const checkoutEnabled = !listing;
  const [auction, setAuction] = useState<Auction | null>(() =>
    listing ? listingToAuction(listing) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(
    listing?.spots[0]?.spotId ?? null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (listing) {
      const next = listingToAuction(listing);
      setAuction(next);
      setSelectedId((current) => current ?? next.spots[0]?.spotId ?? null);
      return;
    }

    const ac = new AbortController();

    fetch("/api/auction", { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Could not load the BrandmyBody auction");
        }
        return res.json() as Promise<Auction>;
      })
      .then((data) => {
        setAuction(data);
        setSelectedId(data.spots[0]?.spotId ?? null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Could not load the auction",
        );
      });

    return () => ac.abort();
  }, [listing]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modalOpen && !dialog.open) dialog.showModal();
    if (!modalOpen && dialog.open) dialog.close();
  }, [modalOpen]);

  const countdown = useCountdown(auction?.endsAt ?? null);
  const listingClosed = Boolean(listing && countdown.closed);
  const selected = auction?.spots.find((spot) => spot.spotId === selectedId);
  const raisedPct =
    auction && auction.goalCents > 0
      ? Math.min(100, (auction.raisedCents / auction.goalCents) * 100)
      : 0;

  useEffect(() => {
    if (listingClosed) setModalOpen(false);
  }, [listingClosed]);

  function openSpot(id: number) {
    setSelectedId(id);
    if (listingClosed) return;
    setModalOpen(true);
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav
        lead={
          listing ? (
            <p className="text-sm text-muted">{listing.displayName}</p>
          ) : null
        }
        extra={
          <>
            {listing ? <ListingSocials socials={listing.socials} /> : null}
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </a>
            ))}
            <a href="/account" className="hover:text-foreground">
              Account
            </a>
            {listingClosed ? (
              <span className="rounded-full border border-line px-4 py-2 text-sm">
                Closed
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-full bg-accent px-4 py-2 text-sm text-white hover:brightness-110"
              >
                Get a spot
              </button>
            )}
          </>
        }
      />

      <main id="top" className="flex-1">
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
          <p className="mb-5 text-xs tracking-[0.28em] uppercase text-accent">
            {listing
              ? `${listing.scope === "entire" ? "Entire body" : "Selected spots"} · ${auction?.spots.length ?? 0} spots${listingClosed ? " · Closed" : ""}`
              : "Live auction · 10 spots"}
          </p>
          <h1 className="font-serif max-w-4xl text-5xl leading-[1.05] tracking-tight sm:text-7xl">
            Your brand, on my body.
          </h1>
          {listing ? (
            <p className="mt-3 font-serif text-2xl text-muted">
              {listing.displayName}
            </p>
          ) : null}
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            Brands bid on logo spots. Winning logos are printed as ink tattoos
            and shown in person and in photos. A spot is paid placement, not an
            endorsement, and not a promise of impressions.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-muted">
                Raised
              </p>
              <p className="mt-1 font-serif text-3xl">
                {auction ? formatUsd(auction.raisedCents) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-muted">
                Goal
              </p>
              <p className="mt-1 font-serif text-3xl">
                {auction ? formatUsd(auction.goalCents) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-muted">
                {listingClosed ? "Status" : "Closes in"}
              </p>
              <p className="mt-1 font-mono text-2xl tabular-nums">
                {auction ? countdown.label : "—"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div
              className="h-2 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-label="Raised toward goal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(raisedPct)}
            >
              <div
                className="h-full bg-accent"
                style={{ width: `${raisedPct}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted">
              {auction
                ? `${auction.takenCount} of ${auction.spots.length} spots have a live bid.`
                : error ?? "Loading BrandmyBody auction…"}
            </p>
          </div>
        </section>

        <section id="body" className="border-t border-line py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="font-serif text-4xl">The body</h2>
            <p className="mt-3 max-w-lg text-muted">
              Ten placements. Click a spot to select it. Front, back, and a leg
              area. Worn for 365 days.
            </p>
            <div className="mt-12">
              {auction ? (
                <BodyMap
                  spots={auction.spots}
                  selectedId={selectedId}
                  onSelect={openSpot}
                />
              ) : (
                <div className="h-[420px] rounded-lg border border-line" />
              )}
            </div>
            {selected ? (
              <p className="mt-8 text-sm text-muted">
                Selected: {selected.name} · {selected.sizeLabel} · from{" "}
                {formatUsd(selected.startCents)}
              </p>
            ) : null}
          </div>
        </section>

        <section id="auction" className="border-t border-line py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="font-serif text-4xl">Live auction</h2>
            <p className="mt-3 text-muted">
              Bid must beat current by $20. Prices shown from start cents / 100.
            </p>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line text-xs tracking-[0.16em] uppercase text-muted">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Spot</th>
                    <th className="py-3 pr-4 font-medium">View</th>
                    <th className="py-3 pr-4 font-medium">Size</th>
                    <th className="py-3 pr-4 font-medium">Start</th>
                    <th className="py-3 pr-4 font-medium">Current</th>
                    <th className="py-3 pr-4 font-medium">Min next</th>
                    <th className="py-3 font-medium">
                      <span className="sr-only">Bid</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(auction?.spots ?? []).map((spot) => (
                    <tr
                      key={spot.spotId}
                      className={`border-b border-line ${
                        selectedId === spot.spotId ? "bg-white/5" : ""
                      }`}
                    >
                      <td className="py-4 pr-4">
                        <button
                          type="button"
                          className="text-left hover:text-accent"
                          onClick={() => setSelectedId(spot.spotId)}
                        >
                          {spot.name}
                        </button>
                      </td>
                      <td className="py-4 pr-4 capitalize text-muted">
                        {spot.view ?? "leg"}
                      </td>
                      <td className="py-4 pr-4 text-muted">{spot.sizeLabel}</td>
                      <td className="py-4 pr-4">{formatUsd(spot.startCents)}</td>
                      <td className="py-4 pr-4">
                        {spot.current
                          ? `${formatUsd(spot.current.amountCents)}${
                              spot.current.brandName
                                ? ` · ${spot.current.brandName}`
                                : ""
                            }`
                          : "—"}
                      </td>
                      <td className="py-4 pr-4">
                        {formatUsd(spot.minNextCents)}
                      </td>
                      <td className="py-4 text-right">
                        {listingClosed ? (
                          <span className="text-muted">Closed</span>
                        ) : (
                          <button
                            type="button"
                            className="text-accent hover:underline"
                            onClick={() => openSpot(spot.spotId)}
                          >
                            Get a spot
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-line py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="font-serif text-4xl">How it works</h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n}>
                  <p className="font-mono text-xs text-accent">{step.n}</p>
                  <h3 className="mt-3 font-serif text-2xl">{step.title}</h3>
                  <p className="mt-3 leading-7 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="faq" className="border-t border-line py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="font-serif text-4xl">FAQ</h2>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {FAQS.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                  </summary>
                  <p className="mt-3 max-w-2xl leading-7 text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-5 py-8 text-center text-sm text-muted">
        Brand my Body. Paid placement. Not Brand My Shirt, Brand My Mac, or Brand
        My X.
      </footer>

      {!listingClosed ? (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          className="w-[min(92vw,32rem)] max-h-[90vh] overflow-y-auto rounded-xl border border-line bg-background p-6 text-foreground backdrop:bg-black/70"
          onClose={() => setModalOpen(false)}
        >
          <GetSpotModal
            titleId={titleId}
            spot={selected ?? auction?.spots[0] ?? null}
            checkoutEnabled={checkoutEnabled}
            onClose={() => setModalOpen(false)}
          />
        </dialog>
      ) : null}
    </div>
  );
}

const fieldClass =
  "mt-1 w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

function ListingSocials({ socials }: { socials: Listing["socials"] }) {
  const links = (
    [
      ["x", "X"],
      ["instagram", "Instagram"],
      ["tiktok", "TikTok"],
      ["website", "Website"],
    ] as const
  )
    .map(([key, label]) => {
      const href = socialHref(key, socials[key]);
      return href ? { href, label } : null;
    })
    .filter((link) => link !== null);

  if (links.length === 0) return null;

  return (
    <>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground"
        >
          {link.label}
        </a>
      ))}
    </>
  );
}

function GetSpotModal({
  titleId,
  spot,
  checkoutEnabled,
  onClose,
}: {
  titleId: string;
  spot: Spot | null;
  checkoutEnabled: boolean;
  onClose: () => void;
}) {
  const minDollars = spot ? dollars(spot.minNextCents) : 0;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!spot || submitting) return;

    const form = new FormData(event.currentTarget);
    const bidDollars = Number(form.get("amount"));
    const brandName = String(form.get("brandName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();

    if (!Number.isFinite(bidDollars) || bidDollars < minDollars) {
      setError(`Bid must be at least ${formatUsd(spot.minNextCents)}`);
      return;
    }
    if (!brandName) {
      setError("Brand name is required");
      return;
    }
    if (!email || !email.includes("@")) {
      setError("Email is required");
      return;
    }

    setError(null);
    setSubmitting(true);

    if (!checkoutEnabled) {
      setError("Checkout stays on the original demo body for now.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotId: spot.spotId,
          bidCents: Math.round(bidDollars * 100),
          brandName,
          email,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout failed");
        setSubmitting(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Checkout failed");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 id={titleId} className="font-serif text-2xl">
        Get a spot
      </h2>
      {spot ? (
        <p className="mt-3 text-sm leading-6 text-muted">
          {spot.name} · {spot.sizeLabel}
          <br />
          Start {formatUsd(spot.startCents)}. Min next{" "}
          {formatUsd(spot.minNextCents)}. 20% deposit, $5,000 minimum.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Loading spots…</p>
      )}
      <p className="mt-3 text-sm text-muted">
        Winning logos are printed as ink tattoos and worn for 365 days. Paid
        placement, not an endorsement.
      </p>
      <form
        key={spot?.spotId ?? "empty"}
        className="mt-5 grid gap-3"
        onSubmit={onSubmit}
      >
        <label className="text-sm">
          Bid amount
          <input
            name="amount"
            type="number"
            required
            min={minDollars}
            step="1"
            defaultValue={minDollars || ""}
            className={fieldClass}
          />
        </label>
        <label className="text-sm">
          Brand name
          <input
            name="brandName"
            type="text"
            required
            autoComplete="organization"
            className={fieldClass}
          />
        </label>
        <label className="text-sm">
          Website
          <input name="website" type="url" placeholder="https://" className={fieldClass} />
        </label>
        <label className="text-sm">
          X handle
          <input name="xHandle" type="text" placeholder="@brand" className={fieldClass} />
        </label>
        <label className="text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={fieldClass}
          />
        </label>
        <label className="text-sm">
          Logo
          <input
            name="logo"
            type="file"
            accept="image/*"
            className={`${fieldClass} file:mr-3 file:rounded file:border-0 file:bg-line file:px-2 file:py-1 file:text-foreground`}
          />
        </label>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting || !spot}
            className="rounded-full bg-accent px-4 py-2 text-sm text-white hover:brightness-110 disabled:opacity-50"
          >
            {submitting
              ? "Redirecting…"
              : checkoutEnabled
                ? "Get a spot"
                : "Get a spot"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </form>
    </div>
  );
}
