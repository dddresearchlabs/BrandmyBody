import { getSessionUser } from "@/lib/auth";
import { fetchListerAccount, saveListerConnect } from "@/lib/lister-accounts";
import { siteOrigin } from "@/lib/site-origin";
import { getStripe, assertStripeTestMode } from "@/lib/stripe";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, siteOrigin(request)));
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return redirectTo(request, "/login?next=/connect/callback");
  }

  try {
    const stored = await fetchListerAccount(user.id);
    if (!stored.stripeAccountId) {
      return redirectTo(request, "/connect");
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(stored.stripeAccountId);
    assertStripeTestMode(account);

    await saveListerConnect(user.id, {
      stripeAccountId: account.id,
      chargesEnabled: Boolean(account.charges_enabled),
    });

    return redirectTo(request, "/account");
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const safe = message.startsWith("Stripe test mode only")
      ? message
      : "Could not finish Connect";
    return redirectTo(request, `/connect?error=${encodeURIComponent(safe)}`);
  }
}
