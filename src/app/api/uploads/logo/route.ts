import { imageExtension } from "@/lib/image-file";
import { publicError } from "@/lib/public-error";
import {
  LOGOS_BUCKET,
  formFile,
  uploadPublicImage,
} from "@/lib/storage-upload";
import { retrieveTestCheckoutSession } from "@/lib/stripe-refund";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const sessionId = String(form.get("sessionId") ?? "").trim();
    if (!sessionId.startsWith("cs_test_")) {
      return Response.json(
        {
          error: sessionId
            ? "Stripe test mode only. This session was not recorded."
            : "Missing Checkout session.",
        },
        { status: 400 },
      );
    }

    const session = await retrieveTestCheckoutSession(sessionId);
    if (session.payment_status !== "paid") {
      return Response.json(
        { error: "Payment is not complete" },
        { status: 400 },
      );
    }

    const file = formFile(form);
    const ext = imageExtension(file.type);
    if (!ext) {
      return Response.json(
        { error: "Use a JPEG, PNG, WebP, or GIF image" },
        { status: 400 },
      );
    }

    const listingId = String(session.metadata?.listingId ?? "home").trim() || "home";
    const url = await uploadPublicImage({
      bucket: LOGOS_BUCKET,
      path: `${listingId}/${sessionId}.${ext}`,
      file,
    });
    return Response.json({ url });
  } catch (err) {
    const message = publicError(err, "Could not upload logo");
    if (/Content-Type was not|Failed to parse body/i.test(message)) {
      return Response.json({ error: "Choose an image file" }, { status: 400 });
    }
    const status = /JPEG|2 MB|image file|Payment is not complete|test mode/i.test(
      message,
    )
      ? 400
      : 503;
    return Response.json({ error: message }, { status });
  }
}
