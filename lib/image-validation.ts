import sharp from "sharp";

import { ALLOWED_MIME_TYPES } from "@/lib/upload-config";

const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

// Generous ceiling well above any real photo or screenshot — this exists to
// reject deliberately oversized "decompression bomb" style images (a tiny
// file that decodes to an enormous canvas) before they reach disk or the
// bandwidth ledger. sharp already enforces its own ~268-megapixel limit
// internally; this just tightens that further for our use case.
const MAX_MEGAPIXELS = 40_000_000;
const MAX_ANIMATION_FRAMES = 300;

export type DetectedImage = { mimeType: string; extension: string };

/**
 * Sniffs the *actual* bytes of an upload rather than trusting the
 * client-declared Content-Type, which is trivial to spoof — anyone calling
 * the upload API directly (not through a browser) can label any file
 * "image/jpeg" regardless of what it really contains. Decoding it with
 * sharp is both the check and the point: sharp refuses to parse anything
 * that isn't a genuine image in a format it understands, which is exactly
 * what stops an arbitrary script/executable/archive from being smuggled in
 * under a fake image extension.
 *
 * Returns null if the buffer isn't a valid, decodable image in one of our
 * supported formats, or if it's suspiciously large/complex — either way,
 * the caller should reject the upload outright.
 */
export async function detectImage(buffer: Buffer): Promise<DetectedImage | null> {
  let metadata;
  try {
    metadata = await sharp(buffer, { animated: true }).metadata();
  } catch {
    return null;
  }

  const mimeType = metadata.format ? SHARP_FORMAT_TO_MIME[metadata.format] : undefined;
  const extension = mimeType ? ALLOWED_MIME_TYPES[mimeType] : undefined;
  if (!mimeType || !extension) return null;

  const { width = 0, height = 0, pages = 1 } = metadata;
  if (width * height > MAX_MEGAPIXELS) return null;
  if (pages > MAX_ANIMATION_FRAMES) return null;

  return { mimeType, extension };
}
