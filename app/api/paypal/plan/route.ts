import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { ensurePayPalPlan, isPayPalConfigured } from "@/lib/paypal";

/** Any signed-in user can fetch this — it's what the "Upgrade to Paid"
 * button needs client-side to render PayPal's subscribe button. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const settings = await getSiteSettings();
  if (!isPayPalConfigured(settings)) {
    return NextResponse.json({ configured: false });
  }

  try {
    const planId = await ensurePayPalPlan(settings);
    return NextResponse.json({
      configured: true,
      clientId: settings.paypalClientId,
      planId,
      priceUsd: settings.paidPriceUsd,
    });
  } catch (err) {
    return NextResponse.json(
      { configured: false, error: err instanceof Error ? err.message : "PayPal error" },
      { status: 502 },
    );
  }
}
