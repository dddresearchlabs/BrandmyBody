import { Landing } from "@/components/landing";
import { SiteNav } from "@/components/site-nav";
import { fetchListing } from "@/lib/listings-db";
import { publicError } from "@/lib/public-error";
import { stripeKeyMode } from "@/lib/stripe";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const listing = await fetchListing(id);
    return {
      title: listing
        ? `${listing.displayName} · Brand my Body`
        : "Listing · Brand my Body",
    };
  } catch {
    return { title: "Listing · Brand my Body" };
  }
}

export default async function BodyListingPage({ params }: Props) {
  const { id } = await params;
  try {
    const listing = await fetchListing(id);
    if (!listing) notFound();
    return <Landing listing={listing} stripeKeyMode={stripeKeyMode()} />;
  } catch (err) {
    return (
      <div className="flex flex-1 flex-col">
        <SiteNav />
        <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16">
          <h1 className="font-serif text-4xl">Could not load listing</h1>
          <p className="mt-4 text-lg text-accent">
            {publicError(err, "Could not load listing")}
          </p>
        </main>
      </div>
    );
  }
}
