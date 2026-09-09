import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { getSiteSettings } from "@/lib/site-settings";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, UPLOAD_DIR } from "@/lib/upload-config";
import { detectImage } from "@/lib/image-validation";
import { isClamAvConfigured, scanBuffer } from "@/lib/clamav";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES[file.type]) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: JPG, PNG, GIF, WebP, AVIF." },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds the 10MB limit." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Never trust the client-declared Content-Type for what actually gets
  // stored and served back — anyone calling this API directly (not through
  // a browser) can label any file "image/jpeg". Sniff the real bytes
  // instead: this is what stops an arbitrary file from being smuggled in
  // under a fake image extension. The detected format (not file.type)
  // drives everything from here on.
  const detected = await detectImage(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "File isn't a valid image (or it's too large/complex to process)." },
      { status: 400 },
    );
  }

  if (isClamAvConfigured()) {
    const scan = await scanBuffer(buffer);
    if (scan && !scan.clean) {
      console.warn(`[upload] rejected infected upload from user ${session.user.id}: ${scan.signature}`);
      return NextResponse.json(
        { error: "File failed a security scan and was rejected." },
        { status: 400 },
      );
    }
  }

  // Free-tier quota: admins and Paid members are unlimited. Checked against
  // the *current* count/total, i.e. this upload would push them past the
  // limit — not a hard "already over" check — so the very last allowed
  // upload still succeeds.
  if (session.user.role !== "ADMIN") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { membershipTier: true },
    });
    if (user?.membershipTier === "FREE") {
      const [settings, agg] = await Promise.all([
        getSiteSettings(),
        prisma.image.aggregate({
          where: { ownerId: session.user.id },
          _count: true,
          _sum: { sizeBytes: true },
        }),
      ]);
      const currentImages = agg._count;
      const currentBytes = agg._sum.sizeBytes ?? 0;
      const maxBytes = settings.freeMaxStorageMB * 1024 * 1024;

      if (currentImages + 1 > settings.freeMaxImages) {
        return NextResponse.json(
          { error: `Free plan limit reached: max ${settings.freeMaxImages} images. Upgrade to Paid for more.` },
          { status: 403 },
        );
      }
      if (currentBytes + file.size > maxBytes) {
        return NextResponse.json(
          { error: `Free plan storage limit reached: max ${settings.freeMaxStorageMB}MB. Upgrade to Paid for more.` },
          { status: 403 },
        );
      }
    }
  }

  const slug = generateSlug();
  const storedFilename = `${slug}.${detected.extension}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, storedFilename), buffer);

  const image = await prisma.image.create({
    data: {
      slug,
      ownerId: session.user.id,
      originalFilename: file.name,
      storedFilename,
      mimeType: detected.mimeType,
      sizeBytes: file.size,
    },
  });

  return NextResponse.json({ image });
}
