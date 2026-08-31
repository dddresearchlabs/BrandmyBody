import { getStripe } from "@/lib/stripe";
import { spotById } from "@/lib/spots";

export const dynamic = "force-dynamic";

const DEPOSIT_PERCENT = 0.2;
const MIN_DEPOSIT_CENTS = 1000;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function siteOrigin(request: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const spotId = Number(payload.spotId);
  const bidCents = Math.round(Number(payload.bidCents));
  const brandName = asString(payload.brandName);
  const email = asString(payload.email);

  const spot = Number.isInteger(spotId) ? spotById(spotId) : null;
  if (!spot) {
    return Response.json({ error: "Unknown spot" }, { status: 400 });
  }

  const minNextCents = spot.startCents;
  if (!Number.isFinite(bidCents) || bidCents < minNextCents) {
    return Response.json(
      { error: "Bid must be at least the min next amount" },
      { status: 400 },
    );
  }

  if (!brandName) {
    return Response.json({ error: "Brand name is required" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const depositCents = Math.max(
    Math.round(bidCents * DEPOSIT_PERCENT),
    MIN_DEPOSIT_CENTS,
  );

  const origin = siteOrigin(request);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: depositCents,
            product_data: {
              name: `Brand my Body · ${spot.name} deposit`,
              description:
                "20% deposit for an ink tattoo logo placement. Paid placement, not an endorsement.",
            },
          },
        },
      ],
      metadata: {
        spotId: String(spot.spotId),
        bidCents: String(bidCents),
        brandName: brandName.slice(0, 500),
        email: email.slice(0, 500),
      },
    });

    if (!session.url) {
      return Response.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 502 },
      );
    }

    return Response.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    const safe =
      message.startsWith("Stripe test mode only") ||
      message === "Missing STRIPE_SECRET_KEY"
        ? message
        : "Checkout failed";
    return Response.json({ error: safe }, { status: 503 });
  }
}
