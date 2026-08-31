import "server-only";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { HARDCODED_SPOTS } from "@/lib/spots";
import {
  dollarsToCents,
  isDurationDays,
  normalizeListing,
  type CreateListingInput,
  type Listing,
  type ListingSocials,
  type ListingSpot,
} from "@/lib/listings";
import type { LiveBid } from "@/lib/auction";

const DATA_PATH = path.join(process.cwd(), "data", "listings.json");

function load(): Listing[] {
  try {
    const rows = JSON.parse(readFileSync(DATA_PATH, "utf8")) as Listing[];
    return rows.map(normalizeListing);
  } catch {
    return [];
  }
}

function save(listings: Listing[]) {
  mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(listings, null, 2));
}

export function getListings() {
  return load();
}

export function getListing(id: string) {
  return load().find((listing) => listing.id === id) ?? null;
}

export function createListing(input: CreateListingInput) {
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new Error("Display name is required");
  }

  const socials: ListingSocials = {
    x: input.socials.x.trim(),
    instagram: input.socials.instagram.trim(),
    tiktok: input.socials.tiktok.trim(),
    website: input.socials.website.trim(),
  };

  let spots: ListingSpot[] = [];

  if (input.scope === "entire") {
    const price = Number(input.bodyPriceDollars);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Starting price is required");
    }
    const startCents = dollarsToCents(price);
    spots = HARDCODED_SPOTS.map((spot) => ({
      spotId: spot.spotId,
      startCents,
    }));
  } else {
    const selected = (input.spots ?? []).filter((spot) =>
      HARDCODED_SPOTS.some((catalog) => catalog.spotId === spot.spotId),
    );
    if (selected.length === 0) {
      throw new Error("Select at least one spot");
    }
    for (const spot of selected) {
      if (!Number.isFinite(spot.priceDollars) || spot.priceDollars <= 0) {
        throw new Error("Each selected spot needs a starting price");
      }
    }
    spots = selected.map((spot) => ({
      spotId: spot.spotId,
      startCents: dollarsToCents(spot.priceDollars),
    }));
  }

  if (!isDurationDays(input.durationDays)) {
    throw new Error("Choose an auction length");
  }

  const now = Date.now();
  const listing: Listing = {
    id: crypto.randomUUID(),
    displayName,
    socials,
    scope: input.scope,
    spots,
    durationDays: input.durationDays,
    endsAt: new Date(now + input.durationDays * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(now).toISOString(),
    processedSessionIds: [],
  };

  const listings = load();
  listings.unshift(listing);
  save(listings);
  return listing;
}

export function hasListingSession(listingId: string, sessionId: string) {
  const listing = getListing(listingId);
  return Boolean(listing?.processedSessionIds?.includes(sessionId));
}

export function recordListingBid(
  listingId: string,
  sessionId: string,
  spotId: number,
  bid: LiveBid,
) {
  const listings = load();
  const listing = listings.find((row) => row.id === listingId);
  if (!listing) {
    throw new Error("Unknown listing");
  }
  if (listing.processedSessionIds?.includes(sessionId)) {
    return { already: true as const };
  }
  const spot = listing.spots.find((row) => row.spotId === spotId);
  if (!spot) {
    throw new Error("That spot is not on this listing");
  }
  spot.current = bid;
  listing.processedSessionIds = [
    ...(listing.processedSessionIds ?? []),
    sessionId,
  ];
  save(listings);
  return { already: false as const };
}
