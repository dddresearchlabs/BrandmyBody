import { closeEndedListing } from "@/lib/listing-close";
import { fetchExpiredLiveListingIds } from "@/lib/listings-db";
import { publicError } from "@/lib/public-error";

export const dynamic = "force-dynamic";

function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ids = await fetchExpiredLiveListingIds();
    const results = [];
    for (const listingId of ids) {
      try {
        const closed = await closeEndedListing({
          listingId,
          closedBy: "cron",
          request,
        });
        results.push({ listingId, ...closed });
      } catch (err) {
        results.push({
          listingId,
          error: publicError(err, "Could not close listing"),
        });
      }
    }
    return Response.json({ ok: true, closed: results.length, results });
  } catch (err) {
    return Response.json(
      { error: publicError(err, "Could not close listings") },
      { status: 503 },
    );
  }
}
