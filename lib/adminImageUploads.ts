import "server-only";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export function isEmptyFileInput(file: File) {
  return file.size === 0 && (file.name === "" || file.name === "undefined");
}

export function validateImageFile(file: File, label = "Image") {
  if (isEmptyFileInput(file)) {
    return;
  }

  if (file.size === 0) {
    throw new ImageUploadError(`${label} cannot be empty.`);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ImageUploadError(
      `Upload a JPG, PNG, or WebP ${label.toLowerCase()}.`,
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new ImageUploadError(`${label} must be 5 MB or smaller.`);
  }
}

export function getImageUploadErrorMessage(error: unknown) {
  return error instanceof ImageUploadError ? error.message : null;
}

export function sanitizeUploadFilename(name: string) {
  const sanitized = (name || "image")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "image";
}

export function createUploadPath(folder: string, file: File) {
  return `${folder}/${crypto.randomUUID()}-${sanitizeUploadFilename(file.name)}`;
}
