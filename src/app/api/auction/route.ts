import { getHomeAuction } from "@/lib/auction-store";

export const dynamic = "force-dynamic";

export async function GET() {
  // TODO: restore Supabase — auction id=1 (ends_at, goal_cents, closed),
  // spots (id, name, view, size_label, start_cents, min_increment_cents),
  // bids where status = 'live' (spot_id, amount_cents, brand_name, website,
  // x_handle, logo_url, status). Do not call createAdminClient until then.

  return Response.json(getHomeAuction());
}
