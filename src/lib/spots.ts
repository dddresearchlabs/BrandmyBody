export const HARDCODED_SPOTS = [
  {
    spotId: 1,
    name: "Chest center",
    view: "front" as const,
    sizeLabel: "L · 12 × 12 cm",
    startCents: 5_000_000,
  },
  {
    spotId: 2,
    name: "Upper left chest",
    view: "front" as const,
    sizeLabel: "M · 8 × 5 cm",
    startCents: 2_500_000,
  },
  {
    spotId: 3,
    name: "Upper right chest",
    view: "front" as const,
    sizeLabel: "M · 8 × 5 cm",
    startCents: 2_500_000,
  },
  {
    spotId: 4,
    name: "Left sleeve / upper arm",
    view: "front" as const,
    sizeLabel: "M · 8 × 5 cm",
    startCents: 1_000_000,
  },
  {
    spotId: 5,
    name: "Right sleeve / upper arm",
    view: "front" as const,
    sizeLabel: "M · 8 × 5 cm",
    startCents: 1_000_000,
  },
  {
    spotId: 6,
    name: "Mid torso",
    view: "front" as const,
    sizeLabel: "S · 6 × 4 cm",
    startCents: 1_000_000,
  },
  {
    spotId: 7,
    name: "Upper back",
    view: "back" as const,
    sizeLabel: "L · 10 × 6 cm",
    startCents: 2_500_000,
  },
  {
    spotId: 8,
    name: "Left shoulder blade",
    view: "back" as const,
    sizeLabel: "S · 6 × 4 cm",
    startCents: 1_000_000,
  },
  {
    spotId: 9,
    name: "Right shoulder blade",
    view: "back" as const,
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

export const GOAL_CENTS = HARDCODED_SPOTS.reduce(
  (sum, spot) => sum + spot.startCents,
  0,
);

export function spotById(spotId: number) {
  return HARDCODED_SPOTS.find((spot) => spot.spotId === spotId) ?? null;
}
