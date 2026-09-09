import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR } from "@/lib/upload-config";
import { VIEW_SESSION_COOKIE, generateViewSessionId } from "@/lib/view-session";
import { recordBandwidth } from "@/lib/bandwidth";

const ONE_YEAR = 31536000;
const ONE_HOUR = 3600;
const ONE_DAY = 86400;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const image = await prisma.image.findUnique({ where: { slug } });
  if (!image) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  const isOwner = session?.user?.id === image.ownerId;
  const isAdmin = session?.user?.role === "ADMIN";

  if (!image.isPublic && !isOwner && !isAdmin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The file behind a given slug never changes in place (editing only
  // renames/toggles metadata), so the slug itself is a perfectly valid
  // strong ETag — no need to hash file contents on every request.
  const etag = `"${image.slug}"`;
  // Deliberately NOT `immutable` with a year-long max-age: this image's
  // bytes never change, but its *visibility* can (the public/private
  // toggle) — `immutable` would let a browser that cached it while public
  // keep serving it from cache forever after it's made private, with no
  // way to revoke that. A 1h max-age plus must-revalidate still turns
  // every repeat view within that hour into a ~0-byte 304 instead of a
  // full re-download, which is most of the bandwidth win, while capping
  // how long a visibility change can stay stale for someone who already
  // has it cached.
  const cacheControl = `${image.isPublic ? "public" : "private"}, max-age=${ONE_HOUR}, must-revalidate`;
  // Cloudflare (and most CDNs) read this in preference to Cache-Control,
  // letting the *edge* cache far longer than any single browser should —
  // once Cloudflare has a public image cached, repeat requests never reach
  // this origin at all, which is the real bandwidth win of putting a CDN in
  // front. Private images get an explicit, unambiguous no-store: relying
  // on the bare `private` token above being respected by every CDN/proxy
  // is not a bet worth making for something meant to stay private.
  const cdnCacheControl = image.isPublic ? `public, max-age=${ONE_DAY}` : "private, no-store";
  const notModified = request.headers.get("if-none-match") === etag;

  // Resolve (and mint, if missing) the anonymous view-session cookie
  // up front so both the 304 and 200 paths can set it consistently.
  const cookieHeader = request.headers.get("cookie") ?? "";
  const existingSessionId = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${VIEW_SESSION_COOKIE}=`))
    ?.slice(VIEW_SESSION_COOKIE.length + 1);
  const viewSessionId = existingSessionId || generateViewSessionId();

  // Count at most one view per (image, session) — not the owner's own
  // dashboard thumbnail loads, and not a browser reloading the same page a
  // thousand times. `create` throws on the unique(imageId, sessionId)
  // constraint when this session already viewed it; that's the expected
  // "already counted" path, so it's swallowed rather than treated as an
  // error.
  if (!isOwner) {
    try {
      await prisma.imageView.create({ data: { imageId: image.id, sessionId: viewSessionId } });
      await prisma.image.update({ where: { id: image.id }, data: { viewCount: { increment: 1 } } });
      // Recorded on the durable monthly ledger, not derived from this
      // Image row — so it survives the image later being deleted, and
      // rolls over to 0 on its own at the start of each calendar month.
      await recordBandwidth(image.sizeBytes);
    } catch {
      // Already viewed this session — no increment.
    }
  }

  const headers = new Headers({
    ETag: etag,
    "Cache-Control": cacheControl,
    "CDN-Cache-Control": cdnCacheControl,
    // Belt-and-suspenders: the Content-Type set below is always one of a
    // known-safe image/* value already (see lib/image-validation.ts), but
    // this stops a browser from ever second-guessing that and sniffing the
    // bytes as something else.
    "X-Content-Type-Options": "nosniff",
  });
  if (!existingSessionId) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    headers.append(
      "Set-Cookie",
      `${VIEW_SESSION_COOKIE}=${viewSessionId}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax; HttpOnly${secure}`,
    );
  }

  if (notModified) {
    return new NextResponse(null, { status: 304, headers });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(path.join(UPLOAD_DIR, image.storedFilename));
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }

  headers.set("Content-Type", image.mimeType);
  headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(image.originalFilename)}"`);

  return new NextResponse(new Uint8Array(buffer), { headers });
}
