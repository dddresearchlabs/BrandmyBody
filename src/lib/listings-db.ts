import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { asLiveBid, type LiveBid } from "@/lib/auction";
import {
  dollarsToCents,
  HOME_WEAR_MONTHS,
  isDurationDays,
  isListingClosed,
  isWearMonths,
  type CreateListingInput,
  type Listing,
  type ListingSocials,
  type ListingSpot,
} from "@/lib/listings";
import { HARDCODED_SPOTS, spotById } from "@/lib/spots";
import { antiSnipeEndsAt } from "@/lib/auction";
import { publicError } from "@/lib/public-error";
import { fetchListerAccount } from "@/lib/lister-accounts";

type ListingRow = {
  id: string;
  display_name: string;
  x_handle: string | null;
  instagram: string | null;
  tiktok: string | null;
  website: string | null;
  duration_days: number;
  wear_months: number | null;
  ends_at: string;
  entire_body: boolean;
  status: string;
  photo_url: string | null;
  photo_back_url: string | null;
  owner_id: string | null;
};

const LISTING_SELECT =
  "id, display_name, x_handle, instagram, tiktok, website, duration_days, wear_months, ends_at, entire_body, status, photo_url, photo_back_url, owner_id";

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
  stripe_payment_link_id: string | null;
  stripe_payment_link_url: string | null;
  balance_paid_at: string | null;
  deposit_transferred_at: string | null;
  stripe_transfer_id: string | null;
  close_error: string | null;
  bidder_message: string | null;
  win_notified_at: string | null;
  balance_due_at: string | null;
  forfeited_at: string | null;
};

function fail(err: unknown, fallback: string): never {
  throw new Error(publicError(err, fallback));
}

function isUniqueViolation(err: unknown) {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      String((err as { code?: unknown }).code) === "23505",
  );
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
    message: row.bidder_message,
    status: row.status === "live" ? "live" : row.status,
    stripeSessionId: row.stripe_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
  });
}

function asPublicUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return url.startsWith("http") ? url : null;
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
    wearMonths: isWearMonths(listing.wear_months)
      ? listing.wear_months
      : HOME_WEAR_MONTHS,
    endsAt,
    createdAt: endsAt,
    photoUrl: asPublicUrl(listing.photo_url),
    photoBackUrl: asPublicUrl(listing.photo_back_url),
    status:
      listing.status === "removed"
        ? "removed"
        : listing.status === "closed"
          ? "closed"
          : "live",
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
      "id, listing_id, spot_id, amount_cents, brand_name, website, x_handle, email, logo_url, status, stripe_session_id, bidder_message",
    )
    .in("listing_id", listingIds)
    .eq("status", "live");
  if (bidsRes.error) {
    if (/bidder_message|column/i.test(bidsRes.error.message ?? "")) {
      const fallback = await supabase
        .from("listing_bids")
        .select(
          "id, listing_id, spot_id, amount_cents, brand_name, website, x_handle, email, logo_url, status, stripe_session_id",
        )
        .in("listing_id", listingIds)
        .eq("status", "live");
      if (fallback.error) fail(fallback.error, "Could not load listing bids");
      return {
        spots: (spotsRes.data ?? []) as ListingSpotRow[],
        bids: (fallback.data ?? []) as ListingBidRow[],
      };
    }
    fail(bidsRes.error, "Could not load listing bids");
  }

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
      LISTING_SELECT,
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
      LISTING_SELECT,
    )
    .eq("owner_id", ownerId)
    .order("ends_at", { ascending: true });
  if (error) fail(error, "Could not load listings");
  const rows = (data ?? []) as ListingRow[];
  const ids = rows.map((row) => row.id);
  const { spots, bids } = await spotsAndBids(ids);
  const refundErrors = await fetchRefundErrors(ids);
  const closeExtras = await fetchCloseExtras(ids);
  const account = await fetchListerAccount(ownerId);
  return rows.map((row) => {
    const listing = assemble(
      row,
      spots.filter((spot) => spot.listing_id === row.id),
      bids.filter((bid) => bid.listing_id === row.id),
    );
    const messages = refundErrors.get(row.id);
    const extra = closeExtras.get(row.id);
    return {
      ...listing,
      chargesEnabled: account.chargesEnabled,
      refundError: messages?.length ? messages.join(" ") : null,
      closeError: extra?.closeError ?? null,
      balanceLinks: extra?.balanceLinks ?? null,
      forfeitNotes: extra?.forfeitNotes ?? null,
    };
  });
}

export async function fetchListing(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      LISTING_SELECT,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error, "Could not load listing");
  if (!data) return null;
  const row = data as ListingRow;
  const { spots, bids } = await spotsAndBids([id]);
  const listing = assemble(row, spots, bids);
  const ownerId = row.owner_id;
  if (!ownerId) return { ...listing, chargesEnabled: false };
  const account = await fetchListerAccount(ownerId);
  return { ...listing, chargesEnabled: account.chargesEnabled };
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
  if (!isWearMonths(input.wearMonths)) {
    throw new Error("Choose how long logos are worn");
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
  const account = await fetchListerAccount(ownerId);
  const listingRes = await supabase
    .from("listings")
    .insert({
      display_name: displayName,
      x_handle: socials.x,
      instagram: socials.instagram,
      tiktok: socials.tiktok,
      website: socials.website,
      duration_days: input.durationDays,
      wear_months: input.wearMonths,
      ends_at: endsAt,
      entire_body: input.scope === "entire",
      status: "live",
      owner_id: ownerId,
      stripe_account_id: account.stripeAccountId,
      charges_enabled: account.chargesEnabled,
    })
    .select(
      LISTING_SELECT,
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

export async function setListingPhotoUrl(
  listingId: string,
  ownerId: string,
  photoUrl: string,
  view: "front" | "back" = "front",
) {
  const url = asPublicUrl(photoUrl);
  if (!url) {
    throw new Error("Could not save listing photo");
  }
  const supabase = createAdminClient();
  const patch =
    view === "back" ? { photo_back_url: url } : { photo_url: url };
  const { data, error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", listingId)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();
  if (error) fail(error, "Could not save listing photo");
  if (!data) {
    throw new Error("Unknown listing");
  }
}

const BID_SELECT =
  "id, listing_id, spot_id, amount_cents, brand_name, website, x_handle, email, logo_url, status, stripe_session_id, stripe_payment_intent_id, refunded_at, refund_error, stripe_payment_link_id, stripe_payment_link_url, balance_paid_at, deposit_transferred_at, stripe_transfer_id, close_error, bidder_message, win_notified_at, balance_due_at, forfeited_at";

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
  message?: string | null;
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
  if (listing.status === "removed" || listing.status === "closed") {
    return {
      already: false,
      accepted: false,
      closed: true,
      previous: [],
      endsAt: listing.endsAt,
    };
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
  let already = Boolean(existingRes.data);
  const existing = (existingRes.data as ListingBidRow | null) ?? null;

  if (existing && input.logoUrl) {
    const logoRes = await supabase
      .from("listing_bids")
      .update({ logo_url: input.logoUrl })
      .eq("id", existing.id);
    if (logoRes.error) fail(logoRes.error, "Could not save logo");
    existing.logo_url = input.logoUrl;
  }

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
          bidder_message: input.message?.trim() || null,
        })
        .select("id")
        .single();
      if (isUniqueViolation(insertRes.error)) {
        already = true;
      } else if (insertRes.error || !insertRes.data) {
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
        bidder_message: input.message?.trim() || null,
      })
      .select("id")
      .single();
    if (isUniqueViolation(insertRes.error)) {
      already = true;
    } else if (insertRes.error || !insertRes.data) {
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

export async function fetchListingOwner(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, owner_id, status")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error, "Could not load listing");
  if (!data) return null;
  const row = data as { id: string; owner_id: string | null; status: string };
  return {
    id: row.id,
    ownerId: row.owner_id,
    status:
      row.status === "removed"
        ? ("removed" as const)
        : row.status === "closed"
          ? ("closed" as const)
          : ("live" as const),
  };
}

export async function markListingRemoved(
  listingId: string,
  removedBy: "user" | "admin",
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
      removed_by: removedBy,
    })
    .eq("id", listingId)
    .eq("status", "live")
    .select("id")
    .maybeSingle();
  if (error) fail(error, "Could not remove listing");
  if (!data) {
    throw new Error("This listing is not live");
  }
}

export async function listLiveBidsForRefund(listingId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listing_bids")
    .select(BID_SELECT)
    .eq("listing_id", listingId)
    .eq("status", "live")
    .is("refunded_at", null);
  if (error) fail(error, "Could not load listing bids");
  return ((data ?? []) as ListingBidRow[]).map((bid) => ({
    id: bid.id,
    stripeSessionId: bid.stripe_session_id,
    stripePaymentIntentId: bid.stripe_payment_intent_id,
  }));
}

export async function markLiveBidRefunded(
  id: string,
  paymentIntentId: string | null,
) {
  const supabase = createAdminClient();
  const patch: Record<string, string | null> = {
    status: "refunded",
    refunded_at: new Date().toISOString(),
    refund_error: null,
  };
  if (paymentIntentId) patch.stripe_payment_intent_id = paymentIntentId;
  const { error } = await supabase
    .from("listing_bids")
    .update(patch)
    .eq("id", id)
    .eq("status", "live")
    .is("refunded_at", null);
  if (error) fail(error, "Could not save refund");
}

export async function fetchExpiredLiveListingIds(now = Date.now()) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id")
    .eq("status", "live")
    .lte("ends_at", new Date(now).toISOString());
  if (error) fail(error, "Could not load listings");
  return ((data ?? []) as { id: string }[]).map((row) => row.id);
}

export async function markListingClosed(
  listingId: string,
  closedBy: "cron" | "admin" | "owner",
  endsAt?: string,
) {
  const supabase = createAdminClient();
  const now = new Date();
  const patch: Record<string, string> = {
    status: "closed",
    closed_at: now.toISOString(),
    closed_by: closedBy,
  };
  if (endsAt && new Date(endsAt).getTime() > now.getTime()) {
    patch.ends_at = now.toISOString();
  }
  const { data, error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", listingId)
    .eq("status", "live")
    .select("id")
    .maybeSingle();
  if (error) fail(error, "Could not close listing");
  return Boolean(data);
}

export type CloseBid = {
  id: string;
  listingId: string;
  amountCents: number;
  brandName: string | null;
  email: string | null;
  spotName: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripePaymentLinkId: string | null;
  stripePaymentLinkUrl: string | null;
  winNotifiedAt: string | null;
  balanceDueAt: string | null;
  balancePaidAt: string | null;
  depositTransferredAt: string | null;
  stripeTransferId: string | null;
  closeError: string | null;
};

function toCloseBid(bid: ListingBidRow, names: Map<string, string>): CloseBid {
  return {
    id: bid.id,
    listingId: bid.listing_id,
    amountCents: bid.amount_cents,
    brandName: bid.brand_name,
    email: bid.email,
    spotName: names.get(bid.spot_id) ?? "spot",
    stripeSessionId: bid.stripe_session_id,
    stripePaymentIntentId: bid.stripe_payment_intent_id,
    stripePaymentLinkId: bid.stripe_payment_link_id,
    stripePaymentLinkUrl: bid.stripe_payment_link_url,
    winNotifiedAt: bid.win_notified_at,
    balanceDueAt: bid.balance_due_at,
    balancePaidAt: bid.balance_paid_at,
    depositTransferredAt: bid.deposit_transferred_at,
    stripeTransferId: bid.stripe_transfer_id,
    closeError: bid.close_error,
  };
}

async function spotNamesForListingIds(listingIds: string[]) {
  const names = new Map<string, string>();
  if (listingIds.length === 0) return names;
  const supabase = createAdminClient();
  const spotsRes = await supabase
    .from("listing_spots")
    .select("id, name, spot_key")
    .in("listing_id", listingIds);
  if (spotsRes.error) fail(spotsRes.error, "Could not load listing spots");
  for (const row of (spotsRes.data ?? []) as ListingSpotRow[]) {
    names.set(row.id, row.name?.trim() || row.spot_key);
  }
  return names;
}

export async function listLiveBidsForClose(listingId: string): Promise<CloseBid[]> {
  const names = await spotNamesForListingIds([listingId]);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listing_bids")
    .select(BID_SELECT)
    .eq("listing_id", listingId)
    .eq("status", "live");
  if (error) fail(error, "Could not load listing bids");
  return ((data ?? []) as ListingBidRow[]).map((bid) => toCloseBid(bid, names));
}

export async function listWinnersNeedingEmail(): Promise<CloseBid[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listing_bids")
    .select(BID_SELECT)
    .eq("status", "live")
    .is("win_notified_at", null)
    .not("stripe_payment_link_url", "is", null);
  if (error) {
    if (/win_notified_at|stripe_payment_link_url|column/i.test(error.message ?? "")) {
      return [];
    }
    fail(error, "Could not load winner emails");
  }
  const bids = (data ?? []) as ListingBidRow[];
  const names = await spotNamesForListingIds(
    [...new Set(bids.map((bid) => bid.listing_id))],
  );
  return bids.map((bid) => toCloseBid(bid, names));
}

export async function listOverdueUnpaidWinners(): Promise<CloseBid[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listing_bids")
    .select(BID_SELECT)
    .eq("status", "live")
    .is("balance_paid_at", null)
    .not("balance_due_at", "is", null)
    .lte("balance_due_at", new Date().toISOString());
  if (error) {
    if (/balance_due_at|column/i.test(error.message ?? "")) return [];
    fail(error, "Could not load unpaid winners");
  }
  const bids = (data ?? []) as ListingBidRow[];
  const names = await spotNamesForListingIds(
    [...new Set(bids.map((bid) => bid.listing_id))],
  );
  return bids.map((bid) => toCloseBid(bid, names));
}

export async function saveBidCloseResult(
  id: string,
  patch: {
    stripePaymentLinkId?: string | null;
    stripePaymentLinkUrl?: string | null;
    depositTransferredAt?: string | null;
    stripeTransferId?: string | null;
    closeError?: string | null;
    winNotifiedAt?: string | null;
    balanceDueAt?: string | null;
    forfeitedAt?: string | null;
    status?: string | null;
  },
) {
  const supabase = createAdminClient();
  const row: Record<string, string | null> = {};
  if (patch.stripePaymentLinkId !== undefined) {
    row.stripe_payment_link_id = patch.stripePaymentLinkId;
  }
  if (patch.stripePaymentLinkUrl !== undefined) {
    row.stripe_payment_link_url = patch.stripePaymentLinkUrl;
  }
  if (patch.depositTransferredAt !== undefined) {
    row.deposit_transferred_at = patch.depositTransferredAt;
  }
  if (patch.stripeTransferId !== undefined) {
    row.stripe_transfer_id = patch.stripeTransferId;
  }
  if (patch.closeError !== undefined) {
    row.close_error = patch.closeError;
  }
  if (patch.winNotifiedAt !== undefined) {
    row.win_notified_at = patch.winNotifiedAt;
  }
  if (patch.balanceDueAt !== undefined) {
    row.balance_due_at = patch.balanceDueAt;
  }
  if (patch.forfeitedAt !== undefined) {
    row.forfeited_at = patch.forfeitedAt;
  }
  if (patch.status !== undefined) {
    row.status = patch.status;
  }
  const { error } = await supabase.from("listing_bids").update(row).eq("id", id);
  if (error) fail(error, "Could not save close result");
}

export async function markBidForfeited(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("listing_bids")
    .update({
      status: "forfeited",
      forfeited_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "live")
    .is("balance_paid_at", null);
  if (error) fail(error, "Could not forfeit unpaid winner");
}

export async function markBalancePaid(bidId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listing_bids")
    .update({ balance_paid_at: new Date().toISOString(), close_error: null })
    .eq("id", bidId)
    .eq("status", "live")
    .is("balance_paid_at", null)
    .select("id, listing_id, amount_cents, brand_name")
    .maybeSingle();
  if (error) fail(error, "Could not record remaining payment");
  if (data) {
    return {
      already: false as const,
      listingId: (data as ListingBidRow).listing_id,
      amountCents: (data as ListingBidRow).amount_cents,
      brandName: (data as ListingBidRow).brand_name,
    };
  }
  const existing = await supabase
    .from("listing_bids")
    .select("id, listing_id, amount_cents, brand_name, balance_paid_at, status")
    .eq("id", bidId)
    .maybeSingle();
  if (existing.error) fail(existing.error, "Could not record remaining payment");
  const row = existing.data as ListingBidRow | null;
  if (!row || row.status !== "live") return null;
  return {
    already: true as const,
    listingId: row.listing_id,
    amountCents: row.amount_cents,
    brandName: row.brand_name,
  };
}

async function fetchCloseExtras(listingIds: string[]) {
  const map = new Map<
    string,
    {
      closeError: string | null;
      balanceLinks: { label: string; url: string; dueAt?: string | null }[];
      forfeitNotes: string[];
    }
  >();
  if (listingIds.length === 0) return map;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listing_bids")
    .select(
      "listing_id, brand_name, stripe_payment_link_url, close_error, status, balance_due_at, forfeited_at",
    )
    .in("listing_id", listingIds)
    .in("status", ["live", "forfeited"]);
  if (error) {
    if (
      /stripe_payment_link_url|close_error|balance_due_at|forfeited_at|column/i.test(
        error.message ?? "",
      )
    ) {
      return map;
    }
    fail(error, "Could not load close status");
  }
  for (const raw of data ?? []) {
    const row = raw as {
      listing_id?: unknown;
      brand_name?: unknown;
      stripe_payment_link_url?: unknown;
      close_error?: unknown;
      status?: unknown;
      balance_due_at?: unknown;
    };
    if (typeof row.listing_id !== "string") continue;
    const current = map.get(row.listing_id) ?? {
      closeError: null,
      balanceLinks: [],
      forfeitNotes: [],
    };
    const brand =
      typeof row.brand_name === "string" && row.brand_name.trim()
        ? row.brand_name.trim()
        : "Winner";
    if (typeof row.close_error === "string" && row.close_error.trim()) {
      current.closeError = current.closeError
        ? `${current.closeError} ${row.close_error.trim()}`
        : row.close_error.trim();
    }
    if (row.status === "forfeited") {
      current.forfeitNotes.push(
        `${brand} missed the remaining 80%. The 20% deposit is kept.`,
      );
    } else if (
      typeof row.stripe_payment_link_url === "string" &&
      row.stripe_payment_link_url.startsWith("http")
    ) {
      const dueAt =
        typeof row.balance_due_at === "string" ? row.balance_due_at : null;
      current.balanceLinks.push({
        label: dueAt
          ? `${brand} · remaining 80% · pay by ${new Date(dueAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })} UTC`
          : `${brand} · remaining 80%`,
        url: row.stripe_payment_link_url,
        dueAt,
      });
    }
    map.set(row.listing_id, current);
  }
  return map;
}
