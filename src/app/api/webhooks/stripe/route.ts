import type Stripe from "stripe";
import { completePaidSession } from "@/lib/record-bid";
import { publicError } from "@/lib/public-error";
import { getStripe, stripeWebhookSecret } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function retryComplete(error: string | undefined) {
  if (!error) return false;
  return /Could not save bid|Could not reach Supabase|Could not record remaining payment|Missing STRIPE/.test(
    error,
  );
}

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = stripeWebhookSecret();
  } catch (err) {
    return Response.json(
      { error: publicError(err, "Webhook is not configured") },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe-Signature" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  if (event.livemode) {
    return Response.json({ received: true });
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = typeof session.id === "string" ? session.id : "";
  if (!sessionId.startsWith("cs_test_")) {
    return Response.json({ received: true });
  }

  try {
    const result = await completePaidSession(sessionId);
    if (retryComplete(result.error)) {
      return Response.json(
        { error: result.error ?? "Could not record bid" },
        { status: 503 },
      );
    }
    return Response.json({ received: true, already: result.already });
  } catch (err) {
    return Response.json(
      { error: publicError(err, "Could not record bid") },
      { status: 503 },
    );
  }
}
