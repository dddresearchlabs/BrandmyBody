import { AccountListings } from "@/app/account/account-listings";
import { SiteNav } from "@/components/site-nav";
import { isAdminEmail } from "@/lib/admin";
import { getSessionUser } from "@/lib/auth";
import { connectStatus, connectStatusLabel } from "@/lib/connect";
import type { Listing } from "@/lib/listings";
import { fetchListingsByOwner, fetchLiveListings } from "@/lib/listings-db";
import { fetchListerAccount } from "@/lib/lister-accounts";
import { publicError } from "@/lib/public-error";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account · Brand my Body",
  description: "Your Brand my Body listings.",
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  const admin = isAdminEmail(user.email);
  let listings: Listing[] = [];
  let adminListings: Listing[] = [];
  let error: string | null = null;
  let payoutsStatus = connectStatus({
    stripeAccountId: null,
    chargesEnabled: false,
  });
  try {
    payoutsStatus = connectStatus(await fetchListerAccount(user.id));
  } catch (err) {
    error = publicError(err, "Could not load Connect status");
  }
  try {
    listings = await fetchListingsByOwner(user.id);
  } catch (err) {
    error = error ?? publicError(err, "Could not load listings");
  }
  if (admin) {
    try {
      adminListings = await fetchLiveListings();
    } catch (err) {
      error = error ?? publicError(err, "Could not load listings");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16">
        <p className="text-xs tracking-[0.28em] uppercase text-accent">
          Marketplace
        </p>
        <h1 className="mt-3 font-serif text-4xl">Account</h1>
        <p className="mt-3 text-muted">Your listings.</p>
        <p className="mt-4 text-sm">
          Connect status:{" "}
          <span className="capitalize text-accent">
            {connectStatusLabel(payoutsStatus)}
          </span>
          {" · "}
          <a href="/connect" className="text-accent hover:underline">
            {payoutsStatus === "ready"
              ? "Manage payouts"
              : payoutsStatus === "pending"
                ? "Continue Connect"
                : "Connect payouts"}
          </a>
        </p>

        {error ? <p className="mt-10 text-accent">{error}</p> : null}

        {!error ? (
          <AccountListings listings={listings} adminListings={adminListings} />
        ) : null}
      </main>
    </div>
  );
}
