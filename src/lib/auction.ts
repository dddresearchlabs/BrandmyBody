export type LiveBid = {
  amountCents: number;
  brandName: string | null;
  website: string | null;
  xHandle: string | null;
  logoUrl: string | null;
  status: string;
  stripeSessionId?: string;
};

/** Min next bid beats current by $10. */
export const BID_INCREMENT_CENTS = 1000;

export function minNextCents(
  startCents: number,
  current: LiveBid | null,
  incrementCents = BID_INCREMENT_CENTS,
) {
  if (!current || current.status !== "live") return startCents;
  return current.amountCents + incrementCents;
}

export function asLiveBid(value: unknown): LiveBid | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const amountCents = Math.round(Number(row.amountCents));
  if (!Number.isFinite(amountCents) || amountCents <= 0) return null;
  if (row.status !== "live") return null;
  const text = (key: string) => {
    const raw = row[key];
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  };
  return {
    amountCents,
    brandName: text("brandName"),
    website: text("website"),
    xHandle: text("xHandle"),
    logoUrl: text("logoUrl"),
    status: "live",
    stripeSessionId: text("stripeSessionId") ?? undefined,
  };
}

export type Spot = {
  spotId: number;
  name: string;
  view: "front" | "back" | null;
  sizeLabel: string;
  startCents: number;
  current: LiveBid | null;
  minNextCents: number;
};

export type Auction = {
  endsAt: string;
  goalCents: number;
  closed: boolean;
  raisedCents: number;
  takenCount: number;
  spots: Spot[];
};

/** SPEC amounts are stored in cents. Display dollars as cents / 100. */
export function dollars(cents: number) {
  return cents / 100;
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars(cents));
}
