export const dynamic = "force-dynamic";

import { HARDCODED_SPOTS, GOAL_CENTS } from "@/lib/spots";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  // TODO: restore Supabase — auction id=1 (ends_at, goal_cents, closed),
  // spots (id, name, view, size_label, start_cents, min_increment_cents),
  // bids where status = 'live' (spot_id, amount_cents, brand_name, website,
  // x_handle, logo_url, status). Do not call createAdminClient until then.

  const endsAt = new Date(Date.now() + 14 * DAY_MS).toISOString();

  return Response.json({
    endsAt,
    goalCents: GOAL_CENTS,
    closed: false,
    raisedCents: 0,
    takenCount: 0,
    spots: HARDCODED_SPOTS.map((spot) => ({
      spotId: spot.spotId,
      name: spot.name,
      view: spot.view,
      sizeLabel: spot.sizeLabel,
      startCents: spot.startCents,
      current: null,
      minNextCents: spot.startCents,
    })),
  });
}
