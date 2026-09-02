import { fetchListing } from "@/lib/listings-db";
import { isListingPublic } from "@/lib/listings";
import { publicError } from "@/lib/public-error";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const listing = await fetchListing(id);
    if (!listing || !isListingPublic(listing)) {
      return Response.json({ error: "Listing not found" }, { status: 404 });
    }
    return Response.json({ listing });
  } catch (err) {
    return Response.json(
      { error: publicError(err, "Could not load listing") },
      { status: 503 },
    );
  }
}
