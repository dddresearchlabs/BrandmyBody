import { SiteNav } from "@/components/site-nav";
import { BrowseGrid } from "@/app/browse/browse-grid";
import { fetchLiveListings } from "@/lib/listings-db";
import { publicError } from "@/lib/public-error";
import type { Listing } from "@/lib/listings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse · Brand my Body",
  description: "Browse Brand my Body listings.",
};

export default async function BrowsePage() {
  let listings: Listing[] = [];
  let error: string | null = null;
  try {
    listings = await fetchLiveListings();
  } catch (err) {
    error = publicError(err, "Could not load listings");
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16">
        <p className="text-xs tracking-[0.28em] uppercase text-accent">
          Marketplace
        </p>
        <h1 className="mt-3 font-serif text-4xl">Browse bodies</h1>
        <p className="mt-3 max-w-xl text-muted">
          Paid logo placements as ink tattoos. Not an endorsement.
        </p>
        {error ? <p className="mt-8 text-accent">{error}</p> : null}
        {!error ? <BrowseGrid listings={listings} /> : null}
      </main>
    </div>
  );
}
