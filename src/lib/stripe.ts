import "server-only";
import Stripe from "stripe";

let stripe: Stripe | undefined;
let stripeKey: string | undefined;

function stripeTestSecret() {
  const raw = process.env.STRIPE_SECRET_KEY?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!raw) return "";
  if (raw.startsWith("sk_test_")) return raw;
  const embedded = raw.match(/sk_test_[A-Za-z0-9]+/);
  return embedded?.[0] ?? raw;
}

function keyKind(key: string) {
  if (key.startsWith("sk_live_")) return "live secret";
  if (key.startsWith("pk_live_")) return "live publishable key";
  if (key.startsWith("pk_test_")) return "test publishable key";
  if (key.startsWith("rk_")) return "restricted key";
  return "not a test secret";
}

export function getStripe() {
  const secretKey = stripeTestSecret();

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!secretKey.startsWith("sk_test_")) {
    throw new Error(
      `Stripe test mode only. STRIPE_SECRET_KEY is a ${keyKind(secretKey)}. Use sk_test_.`,
    );
  }

  if (!stripe || stripeKey !== secretKey) {
    stripe = new Stripe(secretKey);
    stripeKey = secretKey;
  }

  return stripe;
}
