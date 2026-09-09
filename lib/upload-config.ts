import path from "path";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * The server's total outbound bandwidth allowance, used only to render the
 * "bandwidth used vs. total" pie chart on the admin dashboard — set this to
 * match your VPS plan's actual monthly bandwidth quota. Defaults to 1TB if
 * unset.
 */
export const TOTAL_BANDWIDTH_BYTES = Number(process.env.TOTAL_BANDWIDTH_GB ?? 1000) * 1024 ** 3;

/**
 * Storage root for uploaded files. Deliberately outside `public/` — every
 * image is served through app/i/[slug]/route.ts so we can enforce the
 * public/private check and count views; a static file under `public/`
 * would bypass both.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
