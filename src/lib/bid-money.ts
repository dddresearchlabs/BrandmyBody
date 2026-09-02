/** Deposit is 20% of the bid. Stripe’s 50-cent charge minimum is silent. */
export const DEPOSIT_PERCENT = 0.2;
export const BALANCE_PERCENT = 0.8;
/** Platform fee is 10% of the winning bid, taken from the remaining 80% payment. */
export const WIN_FEE_PERCENT = 0.1;
export const STRIPE_MIN_CHARGE_CENTS = 50;
/** Winners have 7 days to pay the remaining 80% or they forfeit the deposit. */
export const BALANCE_DUE_DAYS = 7;
export const BALANCE_DUE_MS = BALANCE_DUE_DAYS * 24 * 60 * 60 * 1000;

export function balanceDueAt(from = Date.now()) {
  return new Date(from + BALANCE_DUE_MS).toISOString();
}

export function depositCents(bidCents: number) {
  return Math.max(
    Math.round(bidCents * DEPOSIT_PERCENT),
    STRIPE_MIN_CHARGE_CENTS,
  );
}

export function balanceCents(bidCents: number) {
  return Math.max(0, bidCents - depositCents(bidCents));
}

/** 10% of the winning bid, never more than the remaining 80% charge minus 1 cent. */
export function winFeeCents(bidCents: number) {
  const fee = Math.round(bidCents * WIN_FEE_PERCENT);
  const cap = Math.max(0, balanceCents(bidCents) - 1);
  return Math.min(Math.max(0, fee), cap);
}
