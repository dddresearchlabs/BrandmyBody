import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { asLiveBid, type LiveBid } from "@/lib/auction";
import {
  dollarsToCents,
  isDurationDays,
  type CreateListingInput,
  type Listing,
  type ListingSocials,
  type ListingSpot,
} from "@/lib/listings";
import { HARDCODED_SPOTS, spotById } from "@/lib/spots";
import { publicError } from "@/lib/public-error";

type ListingRow = {
  id: string;
  display_name: string;
  x_handle: string | null;
  instagram: string | null;
  tiktok: string | null;
  website: string | null;
  duration_days: number;
  ends_at: string;
  entire_body: boolean;
  status: string;
};

type ListingSpotRow = {
  id: string;
  listing_id: string;
  spot_key: string;
  name: string | null;
  view: string | null;
  start_cents: number;
};

type ListingBidRow = {
  id: string;
  listing_id: string;
  spot_id: string;
  amount_cents: number;
  brand_name: string | null;
  website: string | null;
  x_handle: string | null;
  email: string | null;
  logo_url: string | null;
  status: string;
  stripe_session_id: string | null;
};

function fail(err: unknown, fallback: string): never {
  throw new Error(publicError(err, fallback));
}

function spotIdFromKey(key: string) {
  const n = Number(key);
  return Number.isInteger(n) ? n : NaN;
}

function toLiveBid(row: ListingBidRow): LiveBid | null {
  return asLiveBid({
    amountCents: row.amount_cents,
    brandName: row.brand_name,
    website: row.website,
    xHandle: row.x_handle,
    logoUrl: row.logo_url,
    status: row.status === "live" ? "live" : row.status,
    stripeSessionId: row.stripe_session_id,
  });
}

function assemble(
  listing: ListingRow,
  spots: ListingSpotRow[],
  bids: ListingBidRow[],
): Listing {
  const live = bids.filter((bid) => bid.status === "live");
  const mapped: ListingSpot[] = spots.flatMap((spot) => {
    const spotId = spotIdFromKey(spot.spot_key);
    if (!spotById(spotId)) return [];
    const top = live
      .filter((bid) => bid.spot_id === spot.id)
      .sort((a, b) => b.amount_cents - a.amount_cents)[0];
    return [
      {
        spotId,
        startCents: spot.start_cents,
        current: top ? toLiveBid(top) : null,
      },
    ];
  });

  const durationDays = isDurationDays(listing.duration_days)
    ? listing.duration_days
    : 14;
  const endsAt = new Date(listing.ends_at).toISOString();

  return {
    id: listing.id,
    displayName: listing.display_name,
    socials: {
      x: listing.x_handle?.trim() ?? "",
      instagram: listing.instagram?.trim() ?? "",
      tiktok: listing.tiktok?.trim() ?? "",
      website: listing.website?.trim() ?? "",
    },
    scope: listing.entire_body ? "entire" : "selected",
    spots: mapped,
    durationDays,
    endsAt,
    createdAt: endsAt,
  };
}

async function spotsAndBids(listingIds: string[]) {
  if (listingIds.length === 0) {
    return { spots: [] as ListingSpotRow[], bids: [] as ListingBidRow[] };
  }
  const supabase = createAdminClient();
  const spotsRes = await supabase
    .from("listing_spots")
    .select("id, listing_id, spot_key, name, view, start_cents")
    .in("listing_id", listingIds);
  if (spotsRes.error) fail(spotsRes.error, "Could not load listing spots");

  const bidsRes = await supabase
    .from("listing_bids")
    .select(
      "id, listing_id, spot_id, amount_cents, brand_name, website, x_handle, email, logo_url, status, stripe_session_id",
    )
    .in("listing_id", listingIds)
    .eq("status", "live");
  if (bidsRes.error) fail(bidsRes.error, "Could not load listing bids");

  return {
    spots: (spotsRes.data ?? []) as ListingSpotRow[],
    bids: (bidsRes.data ?? []) as ListingBidRow[],
  };
}

export async function fetchListings(status?: "live") {
  const supabase = createAdminClient();
  let query = supabase
    .from("listings")
    .select(
      "id, display_name, x_handle, instagram, tiktok, website, duration_days, ends_at, entire_body, status",
    )
    .order("ends_at", { ascending: true });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) fail(error, "Could not load listings");
  const rows = (data ?? []) as ListingRow[];
  const { spots, bids } = await spotsAndBids(rows.map((row) => row.id));
  return rows.map((row) =>
    assemble(
      row,
      spots.filter((spot) => spot.listing_id === row.id),
      bids.filter((bid) => bid.listing_id === row.id),
    ),
  );
}

export async function fetchLiveListings() {
  return fetchListings("live");
}

export async function fetchListing(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, display_name, x_handle, instagram, tiktok, website, duration_days, ends_at, entire_body, status",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error, "Could not load listing");
  if (!data) return null;
  const { spots, bids } = await spotsAndBids([id]);
  return assemble(data as ListingRow, spots, bids);
}

function buildSpots(input: CreateListingInput) {
  if (input.scope === "entire") {
    const price = Number(input.bodyPriceDollars);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Starting price is required");
    }
    const startCents = dollarsToCents(price);
    return HARDCODED_SPOTS.map((spot) => ({
      spotId: spot.spotId,
      startCents,
    }));
  }
  const selected = (input.spots ?? []).filter((spot) => spotById(spot.spotId));
  if (selected.length === 0) {
    throw new Error("Select at least one spot");
  }
  for (const spot of selected) {
    if (!Number.isFinite(spot.priceDollars) || spot.priceDollars <= 0) {
      throw new Error("Each selected spot needs a starting price");
    }
  }
  return selected.map((spot) => ({
    spotId: spot.spotId,
    startCents: dollarsToCents(spot.priceDollars),
  }));
}

export async function insertListing(input: CreateListingInput) {
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new Error("Display name is required");
  }
  if (!isDurationDays(input.durationDays)) {
    throw new Error("Choose an auction length");
  }

  const socials: ListingSocials = {
    x: input.socials.x.trim(),
    instagram: input.socials.instagram.trim(),
    tiktok: input.socials.tiktok.trim(),
    website: input.socials.website.trim(),
  };
  const spots = buildSpots(input);
  const now = Date.now();
  const endsAt = new Date(
    now + input.durationDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabase = createAdminClient();
  const listingRes = await supabase
    .from("listings")
    .insert({
      display_name: displayName,
      x_handle: socials.x,
      instagram: socials.instagram,
      tiktok: socials.tiktok,
      website: socials.website,
      duration_days: input.durationDays,
      ends_at: endsAt,
      entire_body: input.scope === "entire",
      status: "live",
    })
    .select(
      "id, display_name, x_handle, instagram, tiktok, website, duration_days, ends_at, entire_body, status",
    )
    .single();
  if (listingRes.error || !listingRes.data) {
    fail(listingRes.error, "Could not save listing");
  }

  const listing = listingRes.data as ListingRow;
  const spotRows = spots.map((spot) => {
    const meta = spotById(spot.spotId);
    return {
      listing_id: listing.id,
      spot_key: String(spot.spotId),
      name: meta?.name ?? String(spot.spotId),
      view: meta?.view ?? null,
      start_cents: spot.startCents,
    };
  });

  const spotsRes = await supabase.from("listing_spots").insert(spotRows).select("id");
  if (spotsRes.error) {
    await supabase.from("listings").delete().eq("id", listing.id);
    fail(spotsRes.error, "Could not save listing spots");
  }

  const created = await fetchListing(listing.id);
  if (!created) {
    throw new Error("Could not load listing");
  }
  return created;
}

export async function hasListingBidSession(sessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listing_bids")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error) fail(error, "Could not check existing bid");
  return Boolean(data);
}

export async function insertListingBid(input: {
  listingId: string;
  spotId: number;
  amountCents: number;
  brandName: string;
  website: string | null;
  xHandle: string | null;
  email: string;
  logoUrl: string | null;
  stripeSessionId: string;
}) {
  const listing = await fetchListing(input.listingId);
  if (!listing) {
    throw new Error("Unknown listing");
  }
  const catalogSpot = listing.spots.find((spot) => spot.spotId === input.spotId);
  if (!catalogSpot) {
    throw new Error("That spot is not on this listing");
  }

  const supabase = createAdminClient();
  const spotRes = await supabase
    .from("listing_spots")
    .select("id, spot_key")
    .eq("listing_id", input.listingId)
    .eq("spot_key", String(input.spotId))
    .maybeSingle();
  if (spotRes.error) fail(spotRes.error, "Could not load listing spot");
  if (!spotRes.data) {
    throw new Error("That spot is not on this listing");
  }

  const bidRes = await supabase.from("listing_bids").insert({
    listing_id: input.listingId,
    spot_id: (spotRes.data as ListingSpotRow).id,
    amount_cents: input.amountCents,
    brand_name: input.brandName,
    website: input.website,
    x_handle: input.xHandle,
    email: input.email,
    logo_url: input.logoUrl,
    status: "live",
    stripe_session_id: input.stripeSessionId,
  });
  if (bidRes.error) fail(bidRes.error, "Could not save bid");
}
