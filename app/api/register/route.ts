import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export async function POST(request: Request) {
  const settings = await getSiteSettings();
  if (!settings.registrationOpen) {
    return NextResponse.json({ error: "Registration is closed." }, { status: 403 });
  }

  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim();
  const password = body.password;

  if (!username || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Username is required and password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // Self-registration always lands as a regular, Free-tier user — role and
  // membership upgrades are admin actions only (see app/api/admin/users).
  await prisma.user.create({
    data: { username, passwordHash, role: "USER", membershipTier: "FREE" },
  });

  return NextResponse.json({ ok: true });
}
