export type LiveBid = {
  amountCents: number;
  brandName: string | null;
  website: string | null;
  xHandle: string | null;
  logoUrl: string | null;
  message?: string | null;
  status: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
};

/** Min next bid beats current by $25. */
export const BID_INCREMENT_CENTS = 2500;

/** Last 10 minutes of an auction: a paid bid extends close by 10 minutes. */
export const ANTI_SNIPE_MS = 10 * 60 * 1000;

export function antiSnipeEndsAt(endsAt: string, paidAt = Date.now()) {
  const close = new Date(endsAt).getTime();
  if (!Number.isFinite(close)) return endsAt;
  if (paidAt < close - ANTI_SNIPE_MS) return endsAt;
  return new Date(paidAt + ANTI_SNIPE_MS).toISOString();
}

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
    message: text("message"),
    status: "live",
    stripeSessionId: text("stripeSessionId") ?? undefined,
    stripePaymentIntentId: text("stripePaymentIntentId") ?? undefined,
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
