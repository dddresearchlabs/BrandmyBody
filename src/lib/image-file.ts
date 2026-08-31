export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const IMAGE_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export type ImageMime = keyof typeof IMAGE_MIME;

export function isImageMime(value: string): value is ImageMime {
  return value in IMAGE_MIME;
}

export function imageExtension(mime: string) {
  return isImageMime(mime) ? IMAGE_MIME[mime] : null;
}

export function assertImageFile(file: File) {
  if (!isImageMime(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image");
  }
  if (file.size <= 0) {
    throw new Error("Choose an image file");
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error("Image must be 2 MB or smaller");
  }
}
