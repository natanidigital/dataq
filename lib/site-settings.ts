import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

/**
 * Reads the site's white-label configuration, creating the single default
 * row on first access — no separate seed step needed. Every caller (pages,
 * API routes, generateMetadata, the manifest) just awaits this.
 */
export async function getSiteSettings() {
  return prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID },
    update: {},
  });
}

export type UpdatableSiteSettings = Partial<{
  siteName: string;
  showLogoText: boolean;
  pwaTitle: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoOgImageUrl: string | null;
  registrationOpen: boolean;
  freeMaxImages: number;
  freeMaxStorageMB: number;
  paidPriceUsd: number;
  paypalMode: string | null;
  paypalClientId: string | null;
  paypalClientSecret: string;
  paypalWebhookId: string | null;
  paypalPlanId: string | null;
}>;

export async function updateSiteSettings(data: UpdatableSiteSettings) {
  return prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
}

/** The subset safe to expose to unauthenticated visitors (e.g. the login page). */
export async function getPublicSiteSettings() {
  const settings = await getSiteSettings();
  return {
    siteName: settings.siteName,
    logoUrl: settings.logoUrl,
    showLogoText: settings.showLogoText,
    registrationOpen: settings.registrationOpen,
  };
}
