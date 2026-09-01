import { getSessionUser } from "@/lib/auth";
import { fetchListerAccount, saveListerConnect } from "@/lib/lister-accounts";
import { siteOrigin } from "@/lib/site-origin";
import {
  createV2AccountOnboardingLink,
  getOrCreateV2RecipientAccount,
  recipientTransfersActive,
  stripeErrorText,
} from "@/lib/stripe-connect";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in to connect payouts" }, { status: 401 });
  }

  const email = user.email?.trim() ?? "";
  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const origin = siteOrigin(request);

  try {
    const existing = await fetchListerAccount(user.id);
    const account = await getOrCreateV2RecipientAccount(
      existing.stripeAccountId,
      email,
      user.id,
    );

    await saveListerConnect(user.id, {
      stripeAccountId: account.id,
      chargesEnabled: recipientTransfersActive(account),
    });

    const link = await createV2AccountOnboardingLink(account.id, origin);
    if (!link.url) {
      return Response.json(
        { error: "Stripe did not return an onboarding URL" },
        { status: 502 },
      );
    }

    return Response.json({ url: link.url });
  } catch (err) {
    const message = stripeErrorText(err, "Could not start Connect");
    const status = message.startsWith("Stripe test mode only") ? 400 : 503;
    return Response.json({ error: message }, { status });
  }
}
