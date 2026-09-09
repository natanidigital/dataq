import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      role: true,
      membershipTier: true,
      createdAt: true,
      _count: { select: { images: true } },
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { username?: string; password?: string; role?: string };
  const username = body.username?.trim();
  const password = body.password;
  const role = body.role === "ADMIN" ? "ADMIN" : "USER";

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
  const user = await prisma.user.create({
    data: { username, passwordHash, role },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  return NextResponse.json({ user });
}
