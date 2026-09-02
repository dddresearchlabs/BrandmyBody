import { isAdminEmail } from "@/lib/admin";
import { getSessionUser } from "@/lib/auth";
import { removeListingDeposits } from "@/lib/listing-remove";
import { publicError } from "@/lib/public-error";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in to remove a listing" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "Unknown listing" }, { status: 400 });
  }

  let asAdmin = false;
  try {
    const body = await request.json();
    asAdmin = Boolean(
      body && typeof body === "object" && (body as { admin?: unknown }).admin,
    );
  } catch {
    asAdmin = false;
  }

  if (asAdmin && !isAdminEmail(user.email)) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  try {
    const result = await removeListingDeposits({
      listingId: id,
      userId: user.id,
      asAdmin,
    });
    return Response.json({ ok: true, refundError: result.refundError });
  } catch (err) {
    const message = publicError(err, "Could not remove listing");
    const status =
      message === "Unknown listing"
        ? 404
        : message === "You can only remove your own listings"
          ? 403
          : message === "This listing was removed" ||
              message === "This listing is not live"
            ? 400
            : 503;
    return Response.json({ error: message }, { status });
  }
}
