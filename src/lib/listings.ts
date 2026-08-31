import { HARDCODED_SPOTS } from "@/lib/spots";
import type { Auction, Spot } from "@/lib/auction";

export type ListingScope = "entire" | "selected";

export type ListingSocials = {
  x: string;
  instagram: string;
  tiktok: string;
  website: string;
};

export type ListingSpot = {
  spotId: number;
  startCents: number;
};

export type DurationDays = 1 | 3 | 7 | 14;

export const DURATION_OPTIONS = [
  { days: 1 as const, label: "1 day" },
  { days: 3 as const, label: "3 days" },
  { days: 7 as const, label: "1 week" },
  { days: 14 as const, label: "2 weeks" },
];

export function isDurationDays(value: unknown): value is DurationDays {
  return value === 1 || value === 3 || value === 7 || value === 14;
}

export type Listing = {
  id: string;
  displayName: string;
  socials: ListingSocials;
  scope: ListingScope;
  spots: ListingSpot[];
  durationDays: DurationDays;
  endsAt: string;
  createdAt: string;
};

export type CreateListingInput = {
  displayName: string;
  socials: ListingSocials;
  scope: ListingScope;
  durationDays: DurationDays;
  bodyPriceDollars?: number;
  spots?: { spotId: number; priceDollars: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

export function listingToAuction(listing: Listing): Auction {
  const catalog = new Map<number, (typeof HARDCODED_SPOTS)[number]>(
    HARDCODED_SPOTS.map((spot) => [spot.spotId, spot]),
  );
  const spots: Spot[] = listing.spots.flatMap((row) => {
    const meta = catalog.get(row.spotId);
    if (!meta) return [];
    return [
      {
        spotId: meta.spotId,
        name: meta.name,
        view: meta.view,
        sizeLabel: meta.sizeLabel,
        startCents: row.startCents,
        current: null,
        minNextCents: row.startCents,
      },
    ];
  });

  return {
    endsAt: listing.endsAt,
    goalCents: spots.reduce((sum, spot) => sum + spot.startCents, 0),
    closed: isListingClosed(listing.endsAt),
    raisedCents: 0,
    takenCount: 0,
    spots,
  };
}

export function isListingClosed(endsAt: string, now = Date.now()) {
  return new Date(endsAt).getTime() <= now;
}

export function timeLeftLabel(endsAt: string, now = Date.now()) {
  const remaining = Math.max(0, new Date(endsAt).getTime() - now);
  if (remaining <= 0) return "Closed";
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export function minStartCents(listing: Listing) {
  if (listing.spots.length === 0) return 0;
  return Math.min(...listing.spots.map((spot) => spot.startCents));
}

export function durationLabel(days: DurationDays) {
  return DURATION_OPTIONS.find((option) => option.days === days)?.label ?? `${days} days`;
}

export function normalizeListing(raw: Listing): Listing {
  const durationDays = isDurationDays(raw.durationDays) ? raw.durationDays : 14;
  const createdAt = raw.createdAt ?? new Date().toISOString();
  const endsAt =
    raw.endsAt ??
    new Date(new Date(createdAt).getTime() + durationDays * DAY_MS).toISOString();
  return { ...raw, durationDays, endsAt, createdAt };
}

export function socialHref(kind: keyof ListingSocials, value: string) {
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "");
  if (kind === "x") return `https://x.com/${handle}`;
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "tiktok") return `https://www.tiktok.com/@${handle}`;
  return `https://${raw}`;
}
