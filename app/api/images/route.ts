import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const images = await prisma.image.findMany({
    where: session.user.role === "ADMIN" ? {} : { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { username: true } } },
  });

  return NextResponse.json({ images });
}
