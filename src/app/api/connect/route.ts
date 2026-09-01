import { getSessionUser } from "@/lib/auth";
import { fetchListerAccount, saveListerConnect } from "@/lib/lister-accounts";
import { publicError } from "@/lib/public-error";
import { siteOrigin } from "@/lib/site-origin";
import { getStripe, assertStripeTestMode } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function stripeMissing(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const row = err as { code?: unknown; message?: unknown };
  return (
    row.code === "resource_missing" ||
    (typeof row.message === "string" && /no such account/i.test(row.message))
  );
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in to connect payouts" }, { status: 401 });
  }

  const origin = siteOrigin(request);

  try {
    const stripe = getStripe();
    const existing = await fetchListerAccount(user.id);
    let accountId = existing.stripeAccountId;

    if (accountId) {
      try {
        const retrieved = await stripe.accounts.retrieve(accountId);
        assertStripeTestMode(retrieved);
        accountId = retrieved.id;
        await saveListerConnect(user.id, {
          stripeAccountId: retrieved.id,
          chargesEnabled: Boolean(retrieved.charges_enabled),
        });
      } catch (err) {
        if (!stripeMissing(err)) throw err;
        accountId = null;
      }
    }

    if (!accountId) {
      const created = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      assertStripeTestMode(created);
      accountId = created.id;
      await saveListerConnect(user.id, {
        stripeAccountId: accountId,
        chargesEnabled: Boolean(created.charges_enabled),
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/connect`,
      return_url: `${origin}/connect/callback`,
      type: "account_onboarding",
    });

    if (!link.url) {
      return Response.json(
        { error: "Stripe did not return an onboarding URL" },
        { status: 502 },
      );
    }

    return Response.json({ url: link.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const safe =
      message.startsWith("Stripe test mode only") ||
      message === "Missing STRIPE_SECRET_KEY"
        ? message
        : publicError(err, "Could not start Connect");
    const status = message.startsWith("Stripe test mode only") ? 400 : 503;
    return Response.json({ error: safe }, { status });
  }
}
