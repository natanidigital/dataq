import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { BRANDING_DIR } from "@/lib/branding";

/**
 * Serves admin-uploaded branding assets (logo, PWA icons) from
 * storage/branding/ — see the comment on BRANDING_DIR for why this can't
 * just be a static file under public/.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  // These are all our own generated filenames (timestamp-based, .png only)
  // — reject anything else outright rather than trying to sanitize path
  // traversal characters out of an attacker-controlled segment.
  if (!/^[a-zA-Z0-9_-]+\.png$/.test(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(path.join(BRANDING_DIR, filename));
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      // Every upload gets a new timestamped filename, so unlike user
      // images (where visibility can change under a fixed slug) these are
      // truly immutable — safe to cache forever.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
