import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { saveIconUpload, saveLogoUpload } from "@/lib/branding";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/upload-config";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (kind !== "logo" && kind !== "icon") {
    return NextResponse.json({ error: "kind must be 'logo' or 'icon'" }, { status: 400 });
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

  if (kind === "logo") {
    const logoUrl = await saveLogoUpload(buffer);
    await prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, logoUrl },
      update: { logoUrl },
    });
    return NextResponse.json({ logoUrl });
  }

  const iconUrl = await saveIconUpload(buffer);
  await prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, iconUrl },
    update: { iconUrl },
  });
  return NextResponse.json({ iconUrl });
}
