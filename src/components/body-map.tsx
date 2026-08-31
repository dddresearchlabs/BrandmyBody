import type { Spot } from "@/lib/auction";
import { formatUsd } from "@/lib/auction";

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

function SpotButton({
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
  const clipId = `spot-logo-${spot.spotId}`;

  return (
    <g>
      <title>
        {spot.name} · {priceLabel}
      </title>
      {logoUrl ? (
        <clipPath id={clipId}>
          <circle cx={pos.x} cy={pos.y} r={pos.r} />
        </clipPath>
      ) : null}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={pos.r + 6}
        fill="transparent"
        role="button"
        tabIndex={0}
        aria-label={`${spot.name}, ${priceLabel}`}
        className="cursor-pointer"
        onClick={() => onSelect(spot.spotId)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(spot.spotId);
          }
        }}
      />
      {logoUrl ? (
        <image
          href={logoUrl}
          x={pos.x - pos.r}
          y={pos.y - pos.r}
          width={pos.r * 2}
          height={pos.r * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          className="pointer-events-none"
        />
      ) : (
        <>
          <circle
            cx={pos.x}
            cy={pos.y}
            r={pos.r}
            fill={selected ? "#e23d2a" : "#f3efe7"}
            stroke={selected ? "#f3efe7" : "#e23d2a"}
            strokeWidth={2}
            className="pointer-events-none"
          />
          <text
            x={pos.x}
            y={pos.y + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fill={selected ? "#ffffff" : "#0b0b0b"}
            className="pointer-events-none"
          >
            {spot.spotId}
          </text>
        </>
      )}
      {brand ? (
        <text
          x={pos.x}
          y={pos.y + pos.r + 11}
          textAnchor="middle"
          fontSize="8"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#e23d2a"
          className="pointer-events-none"
        >
          {truncate(brand)}
        </text>
      ) : null}
    </g>
  );
}

export function BodyMap({
  spots,
  selectedId,
  onSelect,
}: {
  spots: Spot[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const front = spots.filter(
    (spot) => spot.view === "front" || spot.view === null,
  );
  const back = spots.filter((spot) => spot.view === "back");

  return (
    <div className="grid gap-10 sm:grid-cols-2">
      <figure className="flex flex-col items-center gap-3">
        <figcaption className="text-xs tracking-[0.2em] uppercase text-muted">
          Front
        </figcaption>
        <svg
          viewBox="0 0 200 420"
          className="h-auto w-full max-w-[280px]"
          role="img"
          aria-label="Front body spots"
        >
          <Figure />
          {front.map((spot) => (
            <SpotButton
              key={spot.spotId}
              spot={spot}
              selected={selectedId === spot.spotId}
              onSelect={onSelect}
            />
          ))}
        </svg>
      </figure>
      <figure className="flex flex-col items-center gap-3">
        <figcaption className="text-xs tracking-[0.2em] uppercase text-muted">
          Back
        </figcaption>
        <svg
          viewBox="0 0 200 420"
          className="h-auto w-full max-w-[280px]"
          role="img"
          aria-label="Back body spots"
        >
          <Figure back />
          {back.map((spot) => (
            <SpotButton
              key={spot.spotId}
              spot={spot}
              selected={selectedId === spot.spotId}
              onSelect={onSelect}
            />
          ))}
        </svg>
      </figure>
    </div>
  );
}
