import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { getSiteSettings } from "@/lib/site-settings";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, UPLOAD_DIR } from "@/lib/upload-config";

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

  const extension = ALLOWED_MIME_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: JPG, PNG, GIF, WebP, AVIF." },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds the 10MB limit." }, { status: 400 });
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
  const storedFilename = `${slug}.${extension}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedFilename), buffer);

  const image = await prisma.image.create({
    data: {
      slug,
      ownerId: session.user.id,
      originalFilename: file.name,
      storedFilename,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });

  return NextResponse.json({ image });
}
