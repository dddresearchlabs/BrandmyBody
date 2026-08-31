import { getSessionUser } from "@/lib/auth";
import { imageExtension } from "@/lib/image-file";
import { setListingPhotoUrl } from "@/lib/listings-db";
import { publicError } from "@/lib/public-error";
import {
  LISTING_PHOTOS_BUCKET,
  formFile,
  uploadPublicImage,
} from "@/lib/storage-upload";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in to list a body" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const listingId = String(form.get("listingId") ?? "").trim();
    if (!UUID_RE.test(listingId)) {
      return Response.json({ error: "Unknown listing" }, { status: 400 });
    }
    const file = formFile(form);
    const ext = imageExtension(file.type);
    if (!ext) {
      return Response.json(
        { error: "Use a JPEG, PNG, WebP, or GIF image" },
        { status: 400 },
      );
    }

    const url = await uploadPublicImage({
      bucket: LISTING_PHOTOS_BUCKET,
      path: `${listingId}/photo.${ext}`,
      file,
    });
    await setListingPhotoUrl(listingId, user.id, url);
    return Response.json({ url });
  } catch (err) {
    const message = publicError(err, "Could not upload listing photo");
    const status =
      message === "Sign in to list a body"
        ? 401
        : message === "Unknown listing"
          ? 404
          : /JPEG|2 MB|image file|Content-Type was not|Failed to parse body/i.test(
                message,
              )
            ? 400
            : 503;
    return Response.json(
      {
        error: /Content-Type was not|Failed to parse body/i.test(message)
          ? "Choose an image file"
          : message,
      },
      { status },
    );
  }
}
