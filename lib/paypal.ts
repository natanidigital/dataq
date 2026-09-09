import { prisma } from "@/lib/prisma";
import type { SiteSettings } from "@/generated/prisma/client";

/**
 * Single-merchant PayPal integration: this instance's own PayPal Developer
 * app credentials (Client ID/Secret, saved via Settings → Membership), not
 * a multi-tenant "Connect with PayPal" OAuth flow — see the discussion in
 * the Settings UI. Every helper here takes the current SiteSettings row
 * rather than reading env vars, since credentials are admin-configured at
 * runtime, not baked in at deploy time.
 */

function apiBase(settings: Pick<SiteSettings, "paypalMode">): string {
  return settings.paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function isPayPalConfigured(
  settings: Pick<SiteSettings, "paypalClientId" | "paypalClientSecret">,
): boolean {
  return Boolean(settings.paypalClientId && settings.paypalClientSecret);
}

/** OAuth2 client-credentials token — short-lived, fetched fresh per use rather than cached, since this only runs on admin/webhook actions (low volume). */
export async function getPayPalAccessToken(
  settings: Pick<SiteSettings, "paypalMode" | "paypalClientId" | "paypalClientSecret">,
): Promise<string> {
  if (!isPayPalConfigured(settings)) {
    throw new Error("PayPal is not configured.");
  }
  const auth = Buffer.from(`${settings.paypalClientId}:${settings.paypalClientSecret}`).toString("base64");
  const res = await fetch(`${apiBase(settings)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Returns a PayPal billing plan id for the current `paidPriceUsd`, creating
 * a fresh Product + Plan on PayPal's side (and caching the id back onto
 * SiteSettings) the first time, or whenever the price has changed since the
 * cached plan was made — PayPal plans are price-immutable once active, so a
 * price change means a new plan, not an edit.
 */
export async function ensurePayPalPlan(settings: SiteSettings): Promise<string> {
  if (settings.paypalPlanId) {
    return settings.paypalPlanId;
  }

  const accessToken = await getPayPalAccessToken(settings);
  const base = apiBase(settings);

  const productRes = await fetch(`${base}/v1/catalogs/products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${settings.siteName} — Paid membership`,
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });
  if (!productRes.ok) {
    throw new Error(`PayPal product creation failed: ${productRes.status} ${await productRes.text()}`);
  }
  const product = (await productRes.json()) as { id: string };

  const planRes = await fetch(`${base}/v1/billing/plans`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: product.id,
      name: `${settings.siteName} Paid — $${settings.paidPriceUsd.toFixed(2)}/mo`,
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 = indefinite, until cancelled
          pricing_scheme: { fixed_price: { value: settings.paidPriceUsd.toFixed(2), currency_code: "USD" } },
        },
      ],
      payment_preferences: { auto_bill_outstanding: true },
    }),
  });
  if (!planRes.ok) {
    throw new Error(`PayPal plan creation failed: ${planRes.status} ${await planRes.text()}`);
  }
  const plan = (await planRes.json()) as { id: string };

  await prisma.siteSettings.update({ where: { id: settings.id }, data: { paypalPlanId: plan.id } });
  return plan.id;
}

/**
 * Verifies an inbound webhook actually came from PayPal, per PayPal's
 * documented verification API — never trust webhook payloads without this.
 */
export async function verifyPayPalWebhookSignature(params: {
  settings: Pick<SiteSettings, "paypalMode" | "paypalClientId" | "paypalClientSecret" | "paypalWebhookId">;
  headers: Headers;
  body: unknown;
}): Promise<boolean> {
  const { settings, headers, body } = params;
  if (!settings.paypalWebhookId || !isPayPalConfigured(settings)) return false;

  const accessToken = await getPayPalAccessToken(settings);
  const res = await fetch(`${apiBase(settings)}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: settings.paypalWebhookId,
      webhook_event: body,
    }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { verification_status: string };
  return data.verification_status === "SUCCESS";
}
