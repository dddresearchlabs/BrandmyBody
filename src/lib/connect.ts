export type ConnectStatus = "not_started" | "pending" | "ready";

export type ListerAccount = {
  stripeAccountId: string | null;
  chargesEnabled: boolean;
};

export function connectStatus(account: ListerAccount): ConnectStatus {
  if (!account.stripeAccountId) return "not_started";
  if (!account.chargesEnabled) return "pending";
  return "ready";
}

export function connectStatusLabel(status: ConnectStatus) {
  if (status === "ready") return "ready";
  if (status === "pending") return "pending";
  return "not started";
}

export type StripeKeyMode = "test" | "live";

export function connectPayoutsCopy(mode?: StripeKeyMode | null) {
  if (mode === "test" || mode === "live") {
    return `Lister has not connected payouts\nstripeKeyMode: "${mode}"`;
  }
  return "Lister has not connected payouts";
}

export const CONNECT_FEE_PERCENT = 0.1;

export function applicationFeeCents(depositCents: number) {
  return Math.max(1, Math.round(depositCents * CONNECT_FEE_PERCENT));
}
