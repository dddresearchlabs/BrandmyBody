import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertImageFile, imageExtension } from "@/lib/image-file";
import { publicError } from "@/lib/public-error";

export const LISTING_PHOTOS_BUCKET = "listing-photos";
export const LOGOS_BUCKET = "logos";

export async function uploadPublicImage(input: {
  bucket: string;
  path: string;
  file: File;
}) {
  assertImageFile(input.file);
  const ext = imageExtension(input.file.type);
  if (!ext) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(input.bucket)
    .upload(input.path, input.file, {
      contentType: input.file.type,
      upsert: true,
      cacheControl: "3600",
    });
  if (error) {
    throw new Error(publicError(error, "Could not upload image"));
  }

  const { data } = supabase.storage.from(input.bucket).getPublicUrl(input.path);
  const url = data.publicUrl?.trim() ?? "";
  if (!url.startsWith("http")) {
    throw new Error("Could not get a public image URL");
  }
  return url;
}

export function formFile(form: FormData, key = "file") {
  const value = form.get(key);
  if (!(value instanceof File) || value.size === 0) {
    throw new Error("Choose an image file");
  }
  return value;
}
