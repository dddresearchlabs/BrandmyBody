import { Landing } from "@/components/landing";
import { getListing } from "@/lib/listings-store";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = getListing(id);
  return {
    title: listing
      ? `${listing.displayName} · Brand my Body`
      : "Listing · Brand my Body",
  };
}

export default async function BodyListingPage({ params }: Props) {
  const { id } = await params;
  const listing = getListing(id);
  if (!listing) notFound();
  return <Landing listing={listing} />;
}
