import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getSiteSettings, updateSiteSettings, type UpdatableSiteSettings } from "@/lib/site-settings";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getSiteSettings();
  // paypalClientSecret is write-only from the client's perspective — once
  // set, the admin never sees it again (only whether one is configured).
  const { paypalClientSecret: _paypalClientSecret, ...safeSettings } = settings;
  return NextResponse.json({ settings: { ...safeSettings, hasPaypalClientSecret: Boolean(_paypalClientSecret) } });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as UpdatableSiteSettings;
  const data: UpdatableSiteSettings = {};

  if (typeof body.siteName === "string" && body.siteName.trim()) data.siteName = body.siteName.trim();
  if (typeof body.showLogoText === "boolean") data.showLogoText = body.showLogoText;
  if (typeof body.pwaTitle === "string" || body.pwaTitle === null) data.pwaTitle = body.pwaTitle;
  if (typeof body.seoTitle === "string" || body.seoTitle === null) data.seoTitle = body.seoTitle;
  if (typeof body.seoDescription === "string" || body.seoDescription === null)
    data.seoDescription = body.seoDescription;
  if (typeof body.seoOgImageUrl === "string" || body.seoOgImageUrl === null)
    data.seoOgImageUrl = body.seoOgImageUrl;
  if (typeof body.registrationOpen === "boolean") data.registrationOpen = body.registrationOpen;
  if (Number.isFinite(body.freeMaxImages)) data.freeMaxImages = Math.max(0, Number(body.freeMaxImages));
  if (Number.isFinite(body.freeMaxStorageMB))
    data.freeMaxStorageMB = Math.max(0, Number(body.freeMaxStorageMB));
  if (Number.isFinite(body.paidPriceUsd)) {
    const newPrice = Math.max(0, Number(body.paidPriceUsd));
    const current = await getSiteSettings();
    data.paidPriceUsd = newPrice;
    // PayPal plans are price-immutable once active — a price change means
    // the next subscriber needs a fresh plan, so drop the cached one.
    if (newPrice !== current.paidPriceUsd) {
      data.paypalPlanId = null;
    }
  }
  if (typeof body.paypalMode === "string" || body.paypalMode === null) data.paypalMode = body.paypalMode;
  if (typeof body.paypalClientId === "string" || body.paypalClientId === null)
    data.paypalClientId = body.paypalClientId;
  if (typeof body.paypalClientSecret === "string" && body.paypalClientSecret.trim())
    data.paypalClientSecret = body.paypalClientSecret.trim();
  if (typeof body.paypalWebhookId === "string" || body.paypalWebhookId === null)
    data.paypalWebhookId = body.paypalWebhookId;

  const settings = await updateSiteSettings(data);
  const { paypalClientSecret: _paypalClientSecret, ...safeSettings } = settings;
  return NextResponse.json({
    settings: { ...safeSettings, hasPaypalClientSecret: Boolean(_paypalClientSecret) },
  });
}
