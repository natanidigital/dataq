import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStorageDriverByName } from "@/lib/storage";

async function loadOwnedImage(id: string, userId: string, isAdmin: boolean) {
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) return null;
  if (!isAdmin && image.ownerId !== userId) return null;
  return image;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const image = await loadOwnedImage(id, session.user.id, session.user.role === "ADMIN");
  if (!image) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as { isPublic?: boolean; originalFilename?: string };
  const data: { isPublic?: boolean; originalFilename?: string } = {};
  if (typeof body.isPublic === "boolean") data.isPublic = body.isPublic;
  if (typeof body.originalFilename === "string" && body.originalFilename.trim()) {
    data.originalFilename = body.originalFilename.trim();
  }

  const updated = await prisma.image.update({ where: { id }, data });
  return NextResponse.json({ image: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const image = await loadOwnedImage(id, session.user.id, session.user.role === "ADMIN");
  if (!image) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.image.delete({ where: { id } });
  // Best-effort: a failure to remove the stored bytes (backend down, key
  // already gone) shouldn't fail the delete — the row is what governs
  // access, and each driver's delete() already swallows "not found".
  try {
    await getStorageDriverByName(image.storageDriver).delete(image.storedFilename);
  } catch {
    // Leave an orphaned object rather than resurrecting the DB row.
  }

  return NextResponse.json({ ok: true });
}
