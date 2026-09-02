import { HARDCODED_SPOTS } from "@/lib/spots";
import {
  asLiveBid,
  minNextCents,
  type Auction,
  type LiveBid,
  type Spot,
} from "@/lib/auction";

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
  current?: LiveBid | null;
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

export type WearMonths = 1 | 3 | 6 | 9 | 12 | 18 | 24;

export const HOME_WEAR_MONTHS: WearMonths = 12;

export const WEAR_OPTIONS = [
  { months: 1 as const, label: "1 month" },
  { months: 3 as const, label: "3 months" },
  { months: 6 as const, label: "6 months" },
  { months: 9 as const, label: "9 months" },
  { months: 12 as const, label: "12 months" },
  { months: 18 as const, label: "18 months" },
  { months: 24 as const, label: "24 months" },
];

export function isWearMonths(value: unknown): value is WearMonths {
  return WEAR_OPTIONS.some((option) => option.months === value);
}

export function wearLabel(months: WearMonths) {
  return months === 1 ? "1 month" : `${months} months`;
}

export function wornForCopy(months: WearMonths) {
  return `worn for ${wearLabel(months)}`;
}

export type Listing = {
  id: string;
  displayName: string;
  socials: ListingSocials;
  scope: ListingScope;
  spots: ListingSpot[];
  durationDays: DurationDays;
  wearMonths: WearMonths;
  endsAt: string;
  createdAt: string;
  photoUrl?: string | null;
  photoBackUrl?: string | null;
  refundError?: string | null;
  closeError?: string | null;
  balanceLinks?: { label: string; url: string; dueAt?: string | null }[] | null;
  forfeitNotes?: string[] | null;
  chargesEnabled?: boolean;
  status: ListingStatus;
};

export type ListingStatus = "live" | "removed" | "closed";

export type CreateListingInput = {
  displayName: string;
  socials: ListingSocials;
  scope: ListingScope;
  durationDays: DurationDays;
  wearMonths: WearMonths;
  bodyPriceDollars?: number;
  spots?: { spotId: number; priceDollars: number }[];
};

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
    const current = asLiveBid(row.current);
    return [
      {
        spotId: meta.spotId,
        name: meta.name,
        view: meta.view,
        sizeLabel: meta.sizeLabel,
        startCents: row.startCents,
        current,
        minNextCents: minNextCents(row.startCents, current),
      },
    ];
  });

  return {
    endsAt: listing.endsAt,
    goalCents: spots.reduce((sum, spot) => sum + spot.startCents, 0),
    closed: isListingClosed(listing.endsAt) || listing.status === "closed",
    raisedCents: spots.reduce(
      (sum, spot) => sum + (spot.current?.amountCents ?? 0),
      0,
    ),
    takenCount: spots.filter((spot) => spot.current).length,
    spots,
  };
}

export function isListingClosed(endsAt: string, now = Date.now()) {
  return new Date(endsAt).getTime() <= now;
}

export function isListingPublic(listing: Pick<Listing, "status">) {
  return listing.status === "live" || listing.status === "closed";
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

export function emptySocials(): ListingSocials {
  return { x: "", instagram: "", tiktok: "", website: "" };
}

export function parseSocials(value: unknown): ListingSocials {
  const row =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const field = (key: keyof ListingSocials) => {
    const raw = row[key];
    return typeof raw === "string" ? raw.trim().slice(0, 200) : "";
  };
  return {
    x: field("x"),
    instagram: field("instagram"),
    tiktok: field("tiktok"),
    website: field("website"),
  };
}

export function socialsToMeta(socials: ListingSocials) {
  return JSON.stringify(socials).slice(0, 500);
}

export const BIDDER_MESSAGE_MAX = 500;

export function parseBidderMessage(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, BIDDER_MESSAGE_MAX);
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
