import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { verifyPayPalWebhookSignature } from "@/lib/paypal";

type PayPalSubscriptionEvent = {
  event_type: string;
  resource: { id: string; custom_id?: string };
};

const ACTIVATING_EVENTS = new Set(["BILLING.SUBSCRIPTION.ACTIVATED", "BILLING.SUBSCRIPTION.RE-ACTIVATED"]);
const DEACTIVATING_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
]);

export async function POST(request: Request) {
  const settings = await getSiteSettings();
  const body = (await request.json()) as PayPalSubscriptionEvent;

  const verified = await verifyPayPalWebhookSignature({ settings, headers: request.headers, body }).catch(
    () => false,
  );
  if (!verified) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const subscriptionId = body.resource?.id;
  const userId = body.resource?.custom_id;

  if (ACTIVATING_EVENTS.has(body.event_type) && userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { membershipTier: "PAID", paypalSubscriptionId: subscriptionId },
    });
  } else if (DEACTIVATING_EVENTS.has(body.event_type) && subscriptionId) {
    // Fall back to matching by subscription id — custom_id isn't included
    // on every PayPal event type, but the subscription id always is once
    // we've recorded it during activation.
    await prisma.user
      .updateMany({
        where: { paypalSubscriptionId: subscriptionId },
        data: { membershipTier: "FREE" },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
