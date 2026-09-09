import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    password?: string;
    username?: string;
    role?: string;
    membershipTier?: string;
  };

  // Password change is its own thing — the caller sends only `password` for
  // that action (existing UI flow), everything else is the "Edit" form.
  if (body.password !== undefined) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    return NextResponse.json({ ok: true });
  }

  const data: { username?: string; role?: "ADMIN" | "USER"; membershipTier?: "FREE" | "PAID" } = {};

  if (typeof body.username === "string" && body.username.trim()) {
    const username = body.username.trim();
    if (username !== user.username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return NextResponse.json({ error: "Username already exists." }, { status: 409 });
      }
      data.username = username;
    }
  }
  if (body.role === "ADMIN" || body.role === "USER") data.role = body.role;
  if (body.membershipTier === "FREE" || body.membershipTier === "PAID") data.membershipTier = body.membershipTier;

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true, membershipTier: true, createdAt: true },
  });

  return NextResponse.json({ user: updated });
}
