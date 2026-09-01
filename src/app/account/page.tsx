import { SiteNav } from "@/components/site-nav";
import { TimeLeft } from "@/components/time-left";
import { formatUsd } from "@/lib/auction";
import { getSessionUser } from "@/lib/auth";
import { connectStatus, connectStatusLabel } from "@/lib/connect";
import {
  durationLabel,
  isListingClosed,
  minStartCents,
  type Listing,
} from "@/lib/listings";
import { fetchListingsByOwner } from "@/lib/listings-db";
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

  let listings: Listing[] = [];
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

        {!error && listings.length === 0 ? (
          <p className="mt-10 text-muted">
            You have no listings yet.{" "}
            <a href="/list" className="text-accent hover:underline">
              List a body
            </a>
            .
          </p>
        ) : null}

        {!error && listings.length > 0 ? (
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {listings.map((listing) => {
              const closed = isListingClosed(listing.endsAt);
              return (
                <li
                  key={listing.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`/b/${listing.id}`}
                        className="font-medium hover:text-accent"
                      >
                        {listing.displayName}
                      </a>
                      {closed ? (
                        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                          Closed
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {listing.scope === "entire" ? "Entire body" : "Selected parts"}{" "}
                      · {listing.spots.length} spots · from{" "}
                      {formatUsd(minStartCents(listing))} ·{" "}
                      {durationLabel(listing.durationDays)}
                    </p>
                    <p className="mt-1 font-mono text-sm">
                      <TimeLeft endsAt={listing.endsAt} />
                    </p>
                    {listing.refundError ? (
                      <p className="mt-2 text-sm text-accent">
                        {listing.refundError}
                      </p>
                    ) : null}
                  </div>
                  <a
                    href={`/b/${listing.id}`}
                    className="text-sm text-accent hover:underline"
                  >
                    View
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
