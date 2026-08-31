import "server-only";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  asLiveBid,
  minNextCents,
  type Auction,
  type LiveBid,
} from "@/lib/auction";
import { GOAL_CENTS, HARDCODED_SPOTS } from "@/lib/spots";

const DATA_PATH = path.join(process.cwd(), "data", "auction.json");
const DAY_MS = 24 * 60 * 60 * 1000;

type HomeSpot = {
  spotId: number;
  current: LiveBid | null;
};

type HomeAuctionState = {
  endsAt: string;
  spots: HomeSpot[];
  processedSessionIds: string[];
};

function emptySpots(): HomeSpot[] {
  return HARDCODED_SPOTS.map((spot) => ({
    spotId: spot.spotId,
    current: null,
  }));
}

function defaultState(): HomeAuctionState {
  return {
    endsAt: new Date(Date.now() + 14 * DAY_MS).toISOString(),
    spots: emptySpots(),
    processedSessionIds: [],
  };
}

function load(): HomeAuctionState {
  try {
    const raw = JSON.parse(readFileSync(DATA_PATH, "utf8")) as HomeAuctionState;
    const spots = emptySpots().map((spot) => {
      const saved = raw.spots?.find((row) => row.spotId === spot.spotId);
      return { spotId: spot.spotId, current: asLiveBid(saved?.current) };
    });
    return {
      endsAt: raw.endsAt ?? defaultState().endsAt,
      spots,
      processedSessionIds: Array.isArray(raw.processedSessionIds)
        ? raw.processedSessionIds.filter((id) => typeof id === "string")
        : [],
    };
  } catch {
    const state = defaultState();
    save(state);
    return state;
  }
}

function save(state: HomeAuctionState) {
  mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(state, null, 2));
}

export function getHomeAuction(): Auction {
  const state = load();
  const spots = HARDCODED_SPOTS.map((meta) => {
    const current =
      state.spots.find((spot) => spot.spotId === meta.spotId)?.current ?? null;
    return {
      spotId: meta.spotId,
      name: meta.name,
      view: meta.view,
      sizeLabel: meta.sizeLabel,
      startCents: meta.startCents,
      current,
      minNextCents: minNextCents(meta.startCents, current),
    };
  });
  return {
    endsAt: state.endsAt,
    goalCents: GOAL_CENTS,
    closed: new Date(state.endsAt).getTime() <= Date.now(),
    raisedCents: spots.reduce(
      (sum, spot) => sum + (spot.current?.amountCents ?? 0),
      0,
    ),
    takenCount: spots.filter((spot) => spot.current).length,
    spots,
  };
}

export function hasHomeSession(sessionId: string) {
  return load().processedSessionIds.includes(sessionId);
}

export function recordHomeBid(sessionId: string, spotId: number, bid: LiveBid) {
  const state = load();
  if (state.processedSessionIds.includes(sessionId)) {
    return { already: true as const };
  }
  const spot = state.spots.find((row) => row.spotId === spotId);
  if (!spot) {
    throw new Error("Unknown spot");
  }
  spot.current = bid;
  state.processedSessionIds.push(sessionId);
  save(state);
  return { already: false as const };
}
