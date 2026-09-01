import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListerAccount } from "@/lib/connect";
import { publicError } from "@/lib/public-error";

function fail(err: unknown, fallback: string): never {
  throw new Error(publicError(err, fallback));
}

export async function fetchListerAccount(userId: string): Promise<ListerAccount> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lister_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail(error, "Could not load Connect status");
  const id = data?.stripe_account_id;
  return {
    stripeAccountId: typeof id === "string" && id.startsWith("acct_") ? id : null,
    chargesEnabled: Boolean(data?.charges_enabled),
  };
}

export async function fetchListingPayouts(
  listingId: string,
): Promise<ListerAccount | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select("owner_id, stripe_account_id, charges_enabled")
    .eq("id", listingId)
    .maybeSingle();
  if (error) fail(error, "Could not load listing");
  if (!data) return null;

  const ownerId =
    typeof data.owner_id === "string" && data.owner_id ? data.owner_id : null;
  if (ownerId) {
    const account = await fetchListerAccount(ownerId);
    if (account.stripeAccountId) return account;
  }

  const id = data.stripe_account_id;
  return {
    stripeAccountId: typeof id === "string" && id.startsWith("acct_") ? id : null,
    chargesEnabled: Boolean(data.charges_enabled),
  };
}

export async function saveListerConnect(
  userId: string,
  account: ListerAccount,
) {
  if (!account.stripeAccountId?.startsWith("acct_")) {
    throw new Error("Could not save Connect account");
  }
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const upsert = await supabase.from("lister_accounts").upsert({
    user_id: userId,
    stripe_account_id: account.stripeAccountId,
    charges_enabled: account.chargesEnabled,
    updated_at: now,
  });
  if (upsert.error) fail(upsert.error, "Could not save Connect account");

  const listings = await supabase
    .from("listings")
    .update({
      stripe_account_id: account.stripeAccountId,
      charges_enabled: account.chargesEnabled,
    })
    .eq("owner_id", userId);
  if (listings.error) fail(listings.error, "Could not save Connect on listings");
}
