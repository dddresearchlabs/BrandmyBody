import { BrowseGrid } from "@/app/browse/browse-grid";
import { SiteNav } from "@/components/site-nav";
import { getListings } from "@/lib/listings-store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse · Brand my Body",
  description: "Browse Brand my Body listings.",
};

export default function BrowsePage() {
  const listings = getListings();

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
        <BrowseGrid listings={listings} />
      </main>
    </div>
  );
}
