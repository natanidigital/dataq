import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { currentPeriodKey, getCurrentBandwidthServed } from "@/lib/bandwidth";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bytesServed = await getCurrentBandwidthServed();
  return NextResponse.json({ bytesServed, periodKey: currentPeriodKey() });
}
