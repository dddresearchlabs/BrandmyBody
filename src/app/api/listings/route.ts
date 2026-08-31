import { createListing, getListings } from "@/lib/listings-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ listings: getListings() });
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
    const listing = createListing({
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
    const message = err instanceof Error ? err.message : "Could not save listing";
    return Response.json({ error: message }, { status: 400 });
  }
}
