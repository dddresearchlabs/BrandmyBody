import "server-only";
import type Stripe from "stripe";
import { publicError } from "@/lib/public-error";
import { getStripe } from "@/lib/stripe";

function asIntentId(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("pi_")) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && id.startsWith("pi_")) return id;
  }
  return null;
}

export function paymentIntentIdFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  return asIntentId(session.payment_intent);
}

export async function retrieveTestCheckoutSession(sessionId: string) {
  if (!sessionId.startsWith("cs_test_")) {
    throw new Error("Stripe test mode only. This session was not recorded.");
  }
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
  if (session.livemode) {
    throw new Error("Stripe test mode only");
  }
  return session;
}

export async function refundOutbidPayment(input: {
  previousSessionId?: string | null;
  previousPaymentIntentId?: string | null;
  newSessionId: string;
  newPaymentIntentId?: string | null;
}): Promise<{ paymentIntentId: string | null; error?: string }> {
  const prevSession = input.previousSessionId?.trim() || null;
  const newSession = input.newSessionId.trim();
  const newPi = input.newPaymentIntentId?.trim() || null;
  let prevPi = input.previousPaymentIntentId?.trim() || null;

  if (prevSession && prevSession === newSession) {
    return { paymentIntentId: null };
  }
  if (prevPi && newPi && prevPi === newPi) {
    return { paymentIntentId: null };
  }

  try {
    if (!prevPi && prevSession) {
      const session = await retrieveTestCheckoutSession(prevSession);
      prevPi = paymentIntentIdFromSession(session);
    }
    if (!prevPi) {
      throw new Error("Could not refund previous bid: missing PaymentIntent");
    }
    if (newPi && prevPi === newPi) {
      return { paymentIntentId: null };
    }

    const stripe = getStripe();
    await stripe.refunds.create({ payment_intent: prevPi });
    return { paymentIntentId: prevPi };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code ?? "")
        : "";
    if (
      code === "charge_already_refunded" ||
      /already been refunded/i.test(
        err instanceof Error ? err.message : "",
      )
    ) {
      return { paymentIntentId: prevPi };
    }
    return {
      paymentIntentId: prevPi,
      error: publicError(err, "Could not refund the previous bidder"),
    };
  }
}
