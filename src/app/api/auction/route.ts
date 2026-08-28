export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

// BrandmyBody spots from SPEC.md. Amounts in cents.
const SPOTS = [
  {
    spotId: 1,
    name: "Chest center",
    view: "front",
    sizeLabel: "L · 12 × 12 cm",
    startCents: 5_000_000,
  },
  {
    spotId: 2,
    name: "Upper left chest",
    view: "front",
    sizeLabel: "M · 8 × 5 cm",
    startCents: 2_500_000,
  },
  {
    spotId: 3,
    name: "Upper right chest",
    view: "front",
    sizeLabel: "M · 8 × 5 cm",
    startCents: 2_500_000,
  },
  {
    spotId: 4,
    name: "Left sleeve / upper arm",
    view: "front",
    sizeLabel: "M · 8 × 5 cm",
    startCents: 1_000_000,
  },
  {
    spotId: 5,
    name: "Right sleeve / upper arm",
    view: "front",
    sizeLabel: "M · 8 × 5 cm",
    startCents: 1_000_000,
  },
  {
    spotId: 6,
    name: "Mid torso",
    view: "front",
    sizeLabel: "S · 6 × 4 cm",
    startCents: 1_000_000,
  },
  {
    spotId: 7,
    name: "Upper back",
    view: "back",
    sizeLabel: "L · 10 × 6 cm",
    startCents: 2_500_000,
  },
  {
    spotId: 8,
    name: "Left shoulder blade",
    view: "back",
    sizeLabel: "S · 6 × 4 cm",
    startCents: 1_000_000,
  },
  {
    spotId: 9,
    name: "Right shoulder blade",
    view: "back",
    sizeLabel: "S · 6 × 4 cm",
    startCents: 1_000_000,
  },
  {
    spotId: 10,
    name: "Leg Area",
    view: null,
    sizeLabel: "S · 6 × 4 cm",
    startCents: 2_500_000,
  },
] as const;

const GOAL_CENTS = SPOTS.reduce((sum, spot) => sum + spot.startCents, 0);

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
    spots: SPOTS.map((spot) => ({
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
