import "server-only";
import Stripe from "stripe";
import type { StripeKeyMode } from "@/lib/connect";

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

/** Mode from STRIPE_SECRET_KEY prefix only. Never returns the key. */
export function stripeKeyMode(): StripeKeyMode | null {
  const raw =
    process.env.STRIPE_SECRET_KEY?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (raw.startsWith("sk_test_")) return "test";
  if (raw.startsWith("sk_live_")) return "live";
  return null;
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
    stripe = new Stripe(secretKey, {
      apiVersion: "2026-08-26.dahlia",
      typescript: true,
    });
    stripeKey = secretKey;
  }

  return stripe;
}

export function assertStripeTestMode(obj: unknown) {
  if (
    obj &&
    typeof obj === "object" &&
    "livemode" in obj &&
    (obj as { livemode?: unknown }).livemode === true
  ) {
    throw new Error("Stripe test mode only");
  }
}
