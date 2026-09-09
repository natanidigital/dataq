import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

// Deliberately NOT under public/: Next.js snapshots the set of static
// public/ files when the server starts (build time in production, dev-server
// start in dev), so a file written there at runtime 404s until the next
// restart — exactly the "no rebuild needed" guarantee this feature is
// supposed to give. Serving these through app/branding/[filename]/route.ts
// instead (same pattern as app/i/[slug]/route.ts for user uploads) reads
// straight from disk on every request, so a fresh upload is servable
// immediately.
export const BRANDING_DIR = path.join(process.cwd(), "storage", "branding");

/**
 * Saves an admin-uploaded logo as-is (just normalized to PNG) — unlike the
 * one-off scripts that built the *default* dataq logo, we don't try to
 * guess and strip a white background here: that heuristic only works for
 * one specific source image, and would risk punching holes in an arbitrary
 * uploaded logo. If the admin wants transparency, they upload a PNG that
 * already has it.
 */
export async function saveLogoUpload(buffer: Buffer): Promise<string> {
  await mkdir(BRANDING_DIR, { recursive: true });
  const filename = `logo-${Date.now()}.png`;
  await sharp(buffer).png().toFile(path.join(BRANDING_DIR, filename));
  return `/branding/${filename}`;
}

/**
 * Derives the PWA/favicon icon set (192, 512, and a white-flattened
 * apple-touch variant) from an admin-uploaded source image, the same sizing
 * approach as scripts/generate-pwa-icons.mjs used for the built-in default.
 * Returns the URL of the 512px version — the canonical `iconUrl` stored on
 * SiteSettings — the other sizes live alongside it by convention
 * (icon-192-<ts>.png, apple-icon-<ts>.png).
 */
export async function saveIconUpload(buffer: Buffer): Promise<string> {
  await mkdir(BRANDING_DIR, { recursive: true });
  const ts = Date.now();
  const square = sharp(buffer).resize(512, 512, { fit: "cover" });

  const squareBuffer = await square.png().toBuffer();
  await sharp(squareBuffer).toFile(path.join(BRANDING_DIR, `icon-512-${ts}.png`));
  await sharp(squareBuffer)
    .resize(192, 192)
    .toFile(path.join(BRANDING_DIR, `icon-192-${ts}.png`));
  await sharp(squareBuffer)
    .resize(180, 180)
    .flatten({ background: "#ffffff" })
    .toFile(path.join(BRANDING_DIR, `apple-icon-${ts}.png`));

  return `/branding/icon-512-${ts}.png`;
}

/** Given the canonical 512px iconUrl, derives the sibling 192/apple paths. */
export function iconVariants(iconUrl: string) {
  return {
    icon512: iconUrl,
    icon192: iconUrl.replace("icon-512-", "icon-192-"),
    appleIcon: iconUrl.replace("icon-512-", "apple-icon-"),
  };
}
