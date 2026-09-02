"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatUsd } from "@/lib/auction";
import { TimeLeft } from "@/components/time-left";
import {
  durationLabel,
  isListingClosed,
  minStartCents,
  type Listing,
} from "@/lib/listings";

const CONFIRM =
  "This refunds all live deposits and takes the listing down.";
const CLOSE_CONFIRM =
  "This closes the auction. Live high bids win. Remaining 80% Payment Links are created. Outbid deposits are not charged.";

function RemoveButton({
  listingId,
  admin,
}: {
  listingId: string;
  admin?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRemove() {
    if (busy) return;
    if (!window.confirm(CONFIRM)) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(admin ? { admin: true } : {}),
      });
      const data = (await res.json()) as {
        error?: string;
        refundError?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not remove listing");
        setBusy(false);
        return;
      }
      if (data.refundError) setError(data.refundError);
      router.refresh();
      setBusy(false);
    } catch {
      setError("Could not remove listing");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        className="text-sm text-accent hover:underline disabled:opacity-50"
      >
        {busy ? "Removing…" : admin ? "Admin remove" : "Remove listing"}
      </button>
      {error ? <p className="max-w-xs text-right text-sm text-accent">{error}</p> : null}
    </div>
  );
}

function CloseButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onClose() {
    if (busy) return;
    if (!window.confirm(CLOSE_CONFIRM)) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/close`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: string;
        closeError?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not close listing");
        setBusy(false);
        return;
      }
      if (data.closeError) setError(data.closeError);
      router.refresh();
      setBusy(false);
    } catch {
      setError("Could not close listing");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="text-sm text-accent hover:underline disabled:opacity-50"
      >
        {busy ? "Closing…" : "Close auction"}
      </button>
      {error ? <p className="max-w-xs text-right text-sm text-accent">{error}</p> : null}
    </div>
  );
}
function ListingRow({
  listing,
  remove,
}: {
  listing: Listing;
  remove?: "owner" | "admin";
}) {
  const ended = isListingClosed(listing.endsAt) || listing.status === "closed";
  const removed = listing.status === "removed";
  const canRemove = Boolean(remove) && listing.status === "live" && !ended;
  const canClose =
    remove === "admin" &&
    !removed &&
    ended &&
    (listing.status === "live" || Boolean(listing.closeError));
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {removed ? (
            <span className="font-medium">{listing.displayName}</span>
          ) : (
            <a href={`/b/${listing.id}`} className="font-medium hover:text-accent">
              {listing.displayName}
            </a>
          )}
          {removed ? (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
              Removed
            </span>
          ) : ended ? (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
              Closed
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted">
          {listing.scope === "entire" ? "Entire body" : "Selected parts"} ·{" "}
          {listing.spots.length} spots · from {formatUsd(minStartCents(listing))} ·{" "}
          {durationLabel(listing.durationDays)}
        </p>
        {removed ? null : (
          <p className="mt-1 font-mono text-sm">
            <TimeLeft endsAt={listing.endsAt} />
          </p>
        )}
        {listing.refundError ? (
          <p className="mt-2 text-sm text-accent">{listing.refundError}</p>
        ) : null}
        {listing.closeError ? (
          <p className="mt-2 text-sm text-accent">{listing.closeError}</p>
        ) : null}
        {listing.balanceLinks?.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {listing.balanceLinks.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-2">
        {removed ? null : (
          <a href={`/b/${listing.id}`} className="text-sm text-accent hover:underline">
            View
          </a>
        )}
        {canRemove ? (
          <RemoveButton listingId={listing.id} admin={remove === "admin"} />
        ) : null}
        {canClose ? <CloseButton listingId={listing.id} /> : null}
      </div>
    </li>
  );
}

export function AccountListings({
  listings,
  adminListings,
}: {
  listings: Listing[];
  adminListings: Listing[];
}) {
  return (
    <>
      {listings.length === 0 ? (
        <p className="mt-10 text-muted">
          You have no listings yet.{" "}
          <a href="/list" className="text-accent hover:underline">
            List a body
          </a>
          .
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {listings.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              remove="owner"
            />
          ))}
        </ul>
      )}

      {adminListings.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-serif text-2xl">Admin</h2>
          <p className="mt-2 text-sm text-muted">Every live listing.</p>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {adminListings.map((listing) => (
              <ListingRow
                key={`admin-${listing.id}`}
                listing={listing}
                remove="admin"
              />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
