"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/auction";
import {
  DURATION_OPTIONS,
  durationLabel,
  minStartCents,
  socialHref,
  type DurationDays,
  type Listing,
} from "@/lib/listings";
import { TimeLeft } from "@/components/time-left";

const FILTERS: { id: "all" | DurationDays; label: string }[] = [
  ...DURATION_OPTIONS.map((option) => ({
    id: option.days,
    label: option.label,
  })),
  { id: "all", label: "all" },
];

function ListingSocials({ listing }: { listing: Listing }) {
  const links = (
    [
      ["x", "X"],
      ["instagram", "IG"],
      ["tiktok", "TT"],
      ["website", "Web"],
    ] as const
  )
    .map(([key, label]) => {
      const href = socialHref(key, listing.socials[key]);
      return href ? { href, label } : null;
    })
    .filter((link) => link !== null);

  if (links.length === 0) {
    return <p className="text-sm text-muted">No socials</p>;
  }

  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
      {links.map((link) => (
        <button
          key={link.label}
          type="button"
          className="hover:text-foreground"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            window.open(link.href, "_blank", "noopener,noreferrer");
          }}
        >
          {link.label}
        </button>
      ))}
    </p>
  );
}

export function BrowseGrid({ listings }: { listings: Listing[] }) {
  const [filter, setFilter] = useState<"all" | DurationDays>("all");
  const visible = useMemo(
    () =>
      filter === "all"
        ? listings
        : listings.filter((listing) => listing.durationDays === filter),
    [filter, listings],
  );

  return (
    <div>
      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Auction length">
        {FILTERS.map((chip) => {
          const on = filter === chip.id;
          return (
            <button
              key={String(chip.id)}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                on
                  ? "border-accent bg-accent text-white"
                  : "border-line text-muted hover:text-foreground"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {listings.length === 0 ? (
        <p className="mt-12 text-muted">
          No listings yet.{" "}
          <a href="/list" className="text-accent hover:underline">
            List a body
          </a>
          .
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-12 text-muted">No listings for this auction length.</p>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((listing) => (
            <li key={listing.id} className="h-full">
              <a
                href={`/b/${listing.id}`}
                className="flex h-full flex-col rounded-xl border border-line p-5 hover:border-accent"
              >
                {listing.photoUrl ? (
                  <img
                    src={listing.photoUrl}
                    alt=""
                    className="mb-4 h-40 w-full rounded-lg object-cover"
                  />
                ) : null}
                <h2 className="font-serif text-2xl">{listing.displayName}</h2>
                <div className="mt-3">
                  <ListingSocials listing={listing} />
                </div>
                <p className="mt-4 text-sm text-muted">
                  {listing.spots.length} spots · from{" "}
                  {formatUsd(minStartCents(listing))} ·{" "}
                  {durationLabel(listing.durationDays)}
                </p>
                <p className="mt-2 font-mono text-sm">
                  <TimeLeft endsAt={listing.endsAt} />
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
