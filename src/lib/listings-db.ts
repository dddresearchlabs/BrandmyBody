import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { asLiveBid, type LiveBid } from "@/lib/auction";
import {
  dollarsToCents,
  isDurationDays,
  isListingClosed,
  type CreateListingInput,
  type Listing,
  type ListingSocials,
  type ListingSpot,
} from "@/lib/listings";
import { HARDCODED_SPOTS, spotById } from "@/lib/spots";
import { antiSnipeEndsAt } from "@/lib/auction";
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
  stripe_payment_intent_id: string | null;
  refunded_at: string | null;
  refund_error: string | null;
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
    stripePaymentIntentId: row.stripe_payment_intent_id,
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

async function fetchRefundErrors(listingIds: string[]) {
  const map = new Map<string, string[]>();
  if (listingIds.length === 0) return map;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listing_bids")
    .select("listing_id, refund_error")
    .in("listing_id", listingIds)
    .not("refund_error", "is", null);
  if (error) {
    if (/refund_error|column/i.test(error.message ?? "")) return map;
    fail(error, "Could not load refund status");
  }
  for (const row of data ?? []) {
    const id = (row as { listing_id?: unknown }).listing_id;
    const message = (row as { refund_error?: unknown }).refund_error;
    if (typeof id !== "string" || typeof message !== "string" || !message.trim()) {
      continue;
    }
    const list = map.get(id) ?? [];
    list.push(message.trim());
    map.set(id, list);
  }
  return map;
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

export async function fetchListingsByOwner(ownerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, display_name, x_handle, instagram, tiktok, website, duration_days, ends_at, entire_body, status",
    )
    .eq("owner_id", ownerId)
    .order("ends_at", { ascending: true });
  if (error) fail(error, "Could not load listings");
  const rows = (data ?? []) as ListingRow[];
  const ids = rows.map((row) => row.id);
  const { spots, bids } = await spotsAndBids(ids);
  const refundErrors = await fetchRefundErrors(ids);
  return rows.map((row) => {
    const listing = assemble(
      row,
      spots.filter((spot) => spot.listing_id === row.id),
      bids.filter((bid) => bid.listing_id === row.id),
    );
    const messages = refundErrors.get(row.id);
    return {
      ...listing,
      refundError: messages?.length ? messages.join(" ") : null,
    };
  });
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

export async function insertListing(ownerId: string, input: CreateListingInput) {
  if (!ownerId) {
    throw new Error("Sign in to list a body");
  }
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
      owner_id: ownerId,
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

const BID_SELECT =
  "id, listing_id, spot_id, amount_cents, brand_name, website, x_handle, email, logo_url, status, stripe_session_id, stripe_payment_intent_id, refunded_at, refund_error";

export type OutbidRefundTarget = {
  id: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
};

export async function recordPaidListingBid(input: {
  listingId: string;
  spotId: number;
  amountCents: number;
  brandName: string;
  website: string | null;
  xHandle: string | null;
  email: string;
  logoUrl: string | null;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  paidAt?: number;
  paidAtStable?: boolean;
}): Promise<{
  already: boolean;
  accepted: boolean;
  closed: boolean;
  previous: OutbidRefundTarget[];
  endsAt: string;
}> {
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
  const listingSpotId = (spotRes.data as ListingSpotRow).id;

  const existingRes = await supabase
    .from("listing_bids")
    .select(BID_SELECT)
    .eq("stripe_session_id", input.stripeSessionId)
    .maybeSingle();
  if (existingRes.error) fail(existingRes.error, "Could not check existing bid");

  const paidAt = input.paidAt ?? Date.now();
  const already = Boolean(existingRes.data);
  const existing = (existingRes.data as ListingBidRow | null) ?? null;

  if (isListingClosed(listing.endsAt, paidAt)) {
    if (!existing) {
      const insertRes = await supabase
        .from("listing_bids")
        .insert({
          listing_id: input.listingId,
          spot_id: listingSpotId,
          amount_cents: input.amountCents,
          brand_name: input.brandName,
          website: input.website,
          x_handle: input.xHandle,
          email: input.email,
          logo_url: input.logoUrl,
          status: "outbid",
          stripe_session_id: input.stripeSessionId,
          stripe_payment_intent_id: input.stripePaymentIntentId,
        })
        .select("id")
        .single();
      if (insertRes.error || !insertRes.data) {
        fail(insertRes.error, "Could not save bid");
      }
    } else if (existing.status === "live") {
      const demoteRes = await supabase
        .from("listing_bids")
        .update({ status: "outbid" })
        .eq("id", existing.id);
      if (demoteRes.error) fail(demoteRes.error, "Could not mark late bid");
    }
    return {
      already,
      accepted: false,
      closed: true,
      previous: [],
      endsAt: listing.endsAt,
    };
  }

  if (!existingRes.data) {
    const insertRes = await supabase
      .from("listing_bids")
      .insert({
        listing_id: input.listingId,
        spot_id: listingSpotId,
        amount_cents: input.amountCents,
        brand_name: input.brandName,
        website: input.website,
        x_handle: input.xHandle,
        email: input.email,
        logo_url: input.logoUrl,
        status: "live",
        stripe_session_id: input.stripeSessionId,
        stripe_payment_intent_id: input.stripePaymentIntentId,
      })
      .select("id")
      .single();
    if (insertRes.error || !insertRes.data) {
      fail(insertRes.error, "Could not save bid");
    }
  }

  const liveRes = await supabase
    .from("listing_bids")
    .select(BID_SELECT)
    .eq("listing_id", input.listingId)
    .eq("spot_id", listingSpotId)
    .eq("status", "live");
  if (liveRes.error) fail(liveRes.error, "Could not load listing bids");
  const live = (liveRes.data ?? []) as ListingBidRow[];
  const paid = live.find((bid) => bid.stripe_session_id === input.stripeSessionId);
  const others = live.filter(
    (bid) => bid.stripe_session_id !== input.stripeSessionId,
  );
  const otherTop = others.reduce(
    (max, bid) => Math.max(max, bid.amount_cents),
    0,
  );
  const accepted = Boolean(
    paid && (others.length === 0 || paid.amount_cents > otherTop),
  );
  const winnerId = accepted
    ? paid!.id
    : others
        .filter((bid) => bid.amount_cents === otherTop)
        .sort((a, b) => a.id.localeCompare(b.id))[0]?.id;

  for (const bid of live) {
    if (bid.id === winnerId) continue;
    const outbidRes = await supabase
      .from("listing_bids")
      .update({ status: "outbid" })
      .eq("id", bid.id);
    if (outbidRes.error) fail(outbidRes.error, "Could not mark previous bid outbid");
  }

  const pendingRes = await supabase
    .from("listing_bids")
    .select(BID_SELECT)
    .eq("listing_id", input.listingId)
    .eq("spot_id", listingSpotId)
    .eq("status", "outbid")
    .is("refunded_at", null);
  if (pendingRes.error) fail(pendingRes.error, "Could not load outbid bids");
  const previous: OutbidRefundTarget[] = ((pendingRes.data ?? []) as ListingBidRow[])
    .filter((bid) => bid.stripe_session_id !== input.stripeSessionId)
    .map((bid) => ({
      id: bid.id,
      stripeSessionId: bid.stripe_session_id,
      stripePaymentIntentId: bid.stripe_payment_intent_id,
    }));

  let endsAt = listing.endsAt;
  if (accepted && (!already || input.paidAtStable)) {
    const nextEnds = antiSnipeEndsAt(listing.endsAt, paidAt);
    if (new Date(nextEnds).getTime() > new Date(listing.endsAt).getTime()) {
      const endsRes = await supabase
        .from("listings")
        .update({ ends_at: nextEnds })
        .eq("id", input.listingId);
      if (endsRes.error) fail(endsRes.error, "Could not extend listing");
      endsAt = nextEnds;
    }
  }

  return { already, accepted, closed: false, previous, endsAt };
}

export async function markListingBidRefunded(
  id: string,
  paymentIntentId: string | null,
) {
  const supabase = createAdminClient();
  const patch: Record<string, string | null> = {
    refunded_at: new Date().toISOString(),
    refund_error: null,
  };
  if (paymentIntentId) patch.stripe_payment_intent_id = paymentIntentId;
  const { error } = await supabase.from("listing_bids").update(patch).eq("id", id);
  if (error) fail(error, "Could not save refund");
}

export async function markListingBidRefundError(id: string, message: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("listing_bids")
    .update({ refund_error: message.slice(0, 280) })
    .eq("id", id);
  if (error) fail(error, "Could not save refund error");
}
