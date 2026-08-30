import "server-only";
import Stripe from "stripe";

let stripe: Stripe | undefined;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Stripe test mode only");
  }

  if (!stripe) {
    stripe = new Stripe(secretKey);
  }

  return stripe;
}
