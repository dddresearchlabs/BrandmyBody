export type LiveBid = {
  amountCents: number;
  brandName: string | null;
  website: string | null;
  xHandle: string | null;
  logoUrl: string | null;
  status: string;
};

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
