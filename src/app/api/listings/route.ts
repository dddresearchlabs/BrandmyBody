import { insertListing, fetchLiveListings } from "@/lib/listings-db";
import { publicError } from "@/lib/public-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const listings = await fetchLiveListings();
    return Response.json({ listings });
  } catch (err) {
    return Response.json(
      { error: publicError(err, "Could not load listings") },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  try {
    const listing = await insertListing({
      displayName: String(payload.displayName ?? ""),
      socials: {
        x: String((payload.socials as { x?: string } | undefined)?.x ?? ""),
        instagram: String(
          (payload.socials as { instagram?: string } | undefined)?.instagram ??
            "",
        ),
        tiktok: String(
          (payload.socials as { tiktok?: string } | undefined)?.tiktok ?? "",
        ),
        website: String(
          (payload.socials as { website?: string } | undefined)?.website ?? "",
        ),
      },
      scope: payload.scope === "selected" ? "selected" : "entire",
      durationDays: Number(payload.durationDays) as 1 | 3 | 7 | 14,
      bodyPriceDollars: Number(payload.bodyPriceDollars),
      spots: Array.isArray(payload.spots)
        ? payload.spots.map((row) => {
            const item = row as { spotId?: unknown; priceDollars?: unknown };
            return {
              spotId: Number(item.spotId),
              priceDollars: Number(item.priceDollars),
            };
          })
        : [],
    });
    return Response.json({ listing }, { status: 201 });
  } catch (err) {
    const message = publicError(err, "Could not save listing");
    const status =
      message === "Display name is required" ||
      message === "Choose an auction length" ||
      message === "Starting price is required" ||
      message === "Select at least one spot" ||
      message === "Each selected spot needs a starting price"
        ? 400
        : 503;
    return Response.json({ error: message }, { status });
  }
}
