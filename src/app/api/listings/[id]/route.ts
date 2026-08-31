import { getListing } from "@/lib/listings-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const listing = getListing(id);
  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }
  return Response.json({ listing });
}
