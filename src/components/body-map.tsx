import type { Spot } from "@/lib/auction";
import { formatUsd } from "@/lib/auction";

const VIEW_W = 200;
const VIEW_H = 420;

const POSITIONS: Record<number, { x: number; y: number; r: number }> = {
  1: { x: 100, y: 150, r: 18 },
  2: { x: 126, y: 132, r: 13 },
  3: { x: 74, y: 132, r: 13 },
  4: { x: 172, y: 168, r: 13 },
  5: { x: 28, y: 168, r: 13 },
  6: { x: 100, y: 198, r: 12 },
  7: { x: 100, y: 138, r: 16 },
  8: { x: 126, y: 152, r: 12 },
  9: { x: 74, y: 152, r: 12 },
  10: { x: 122, y: 300, r: 13 },
};

function Figure({ back }: { back?: boolean }) {
  return (
    <g fill="#222" stroke="#4a4a4a" strokeWidth="1.25">
      <ellipse cx="100" cy="38" rx="24" ry="26" />
      <rect x="90" y="60" width="20" height="16" rx="5" />
      <path d="M62 76h76l18 132H44z" />
      <path d="M136 82l42 14v110h-24V108" />
      <path d="M64 82L22 96v110h24V108" />
      <path d="M100 208h46l-8 196H112z" />
      <path d="M100 208H54l8 196h26z" />
      {back ? (
        <path
          d="M100 78v50"
          fill="none"
          stroke="#3a3a3a"
          strokeWidth="2"
        />
      ) : (
        <ellipse cx="100" cy="36" rx="10" ry="8" fill="#0b0b0b" stroke="none" />
      )}
    </g>
  );
}

function truncate(value: string, max = 10) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function pctX(x: number) {
  return (x / VIEW_W) * 100;
}

function pctY(y: number) {
  return (y / VIEW_H) * 100;
}

function SpotMarker({
  spot,
  selected,
  onSelect,
}: {
  spot: Spot;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const pos = POSITIONS[spot.spotId];
  if (!pos) return null;
  const brand = spot.current?.brandName?.trim() || null;
  const logoUrl = spot.current?.logoUrl?.trim() || null;
  const priceLabel = spot.current
    ? `${formatUsd(spot.current.amountCents)}${brand ? ` · ${brand}` : ""}`
    : `from ${formatUsd(spot.startCents)}`;
  const hitPct = ((pos.r + 6) * 2 / VIEW_W) * 100;
  const innerPct = (pos.r / (pos.r + 6)) * 100;

  return (
    <>
      <button
        type="button"
        aria-label={`${spot.name}, ${priceLabel}`}
        title={`${spot.name} · ${priceLabel}`}
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer bg-transparent p-0"
        style={{
          left: `${pctX(pos.x)}%`,
          top: `${pctY(pos.y)}%`,
          width: `${hitPct}%`,
        }}
        onClick={() => onSelect(spot.spotId)}
      >
        <span
          className={`mx-auto block overflow-hidden rounded-full ${
            selected
              ? "ring-2 ring-accent"
              : logoUrl
                ? "ring-1 ring-[#f3efe7]"
                : "ring-2 ring-accent"
          } ${logoUrl ? "" : selected ? "bg-accent text-white" : "bg-[#f3efe7] text-[#0b0b0b]"}`}
          style={{ width: `${innerPct}%`, aspectRatio: "1" }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[11px] leading-none">
              {spot.spotId}
            </span>
          )}
        </span>
      </button>
      {brand ? (
        <span
          className="pointer-events-none absolute z-10 -translate-x-1/2 text-center text-[8px] leading-none text-accent"
          style={{
            left: `${pctX(pos.x)}%`,
            top: `${pctY(pos.y + pos.r + 11)}%`,
          }}
        >
          {truncate(brand)}
        </span>
      ) : null}
    </>
  );
}

function BodyPanel({
  label,
  ariaLabel,
  back,
  photoUrl,
  spots,
  selectedId,
  onSelect,
}: {
  label: string;
  ariaLabel: string;
  back?: boolean;
  photoUrl?: string | null;
  spots: Spot[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <figcaption className="text-xs tracking-[0.2em] uppercase text-muted">
        {label}
      </figcaption>
      <div
        className="relative w-full max-w-[280px] overflow-hidden bg-[#0b0b0b]"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
        role="img"
        aria-label={ariaLabel}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <Figure back={back} />
          </svg>
        )}
        {spots.map((spot) => (
          <SpotMarker
            key={spot.spotId}
            spot={spot}
            selected={selectedId === spot.spotId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </figure>
  );
}

export function BodyMap({
  spots,
  selectedId,
  onSelect,
  frontPhotoUrl,
  backPhotoUrl,
}: {
  spots: Spot[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  frontPhotoUrl?: string | null;
  backPhotoUrl?: string | null;
}) {
  const front = spots.filter(
    (spot) => spot.view === "front" || spot.view === null,
  );
  const back = spots.filter((spot) => spot.view === "back");

  return (
    <div className="grid gap-10 sm:grid-cols-2">
      <BodyPanel
        label="Front"
        ariaLabel="Front body spots"
        photoUrl={frontPhotoUrl}
        spots={front}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <BodyPanel
        label="Back"
        ariaLabel="Back body spots"
        back
        photoUrl={backPhotoUrl}
        spots={back}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
