import { getSessionUser } from "@/lib/auth";
import { fetchListerAccount, saveListerConnect } from "@/lib/lister-accounts";
import { siteOrigin } from "@/lib/site-origin";
import {
  recipientTransfersActive,
  retrieveV2Account,
  stripeErrorText,
} from "@/lib/stripe-connect";
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

    const account = await retrieveV2Account(stored.stripeAccountId);
    await saveListerConnect(user.id, {
      stripeAccountId: account.id,
      chargesEnabled: recipientTransfersActive(account),
    });

    return redirectTo(request, "/account");
  } catch (err) {
    const message = stripeErrorText(err, "Could not finish Connect");
    return redirectTo(request, `/connect?error=${encodeURIComponent(message)}`);
  }
}
